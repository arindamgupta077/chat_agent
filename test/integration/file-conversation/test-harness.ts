import * as fs from 'node:fs'
import * as path from 'node:path'
import type { ModelMessage } from 'ai'
import { v4 as uuidv4 } from 'uuid'
import TestPlatform from '../../../src/renderer/platform/test_platform'
import type { Message, SessionSettings, Settings, StreamTextResult } from '../../../src/shared/types'
import type { ModelDependencies } from '../../../src/shared/types/adapters'
import { createMockModelDependencies } from '../mocks/model-dependencies'
import { MockSentryAdapter } from '../mocks/sentry'

export interface TestFile {
  storageKey: string
  fileName: string
  fileType: string
  content: string
}

export interface TestMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  files?: Array<{
    storageKey: string
    fileName: string
    fileType: string
  }>
}

export interface FileConversationTestCase {
  name: string
  description?: string
  files: TestFile[]
  messages: TestMessage[]
  modelSettings?: Partial<SessionSettings>
  validate?: (result: TestResult) => void
}

export interface TestResult {
  testName: string
  success: boolean
  error?: string
  messages: Message[]
  coreMessages?: ModelMessage[]
  response?: StreamTextResult
  duration: number
  toolCalls: Array<{
    toolName: string
    args: any
    result: any
  }>
}

export function createUserMessageWithFiles(content: string, files: TestFile[]): Message {
  const message: Message = {
    id: uuidv4(),
    role: 'user',
    contentParts: [{ type: 'text', text: content }],
    timestamp: Date.now(),
  }

  message.files = files.map((f) => ({
    id: `file-${f.storageKey}`,
    name: f.fileName,
    fileType: f.fileType,
    storageKey: f.storageKey,
  }))

  return message
}

export class FileConversationTestContext {
  public platform: TestPlatform
  public sentry: MockSentryAdapter

  constructor() {
    this.platform = new TestPlatform()
    this.sentry = new MockSentryAdapter()
  }

  async createModelDependencies(): Promise<ModelDependencies> {
    return createMockModelDependencies(this.platform, this.sentry)
  }

  loadFiles(files: TestFile[]): void {
    for (const file of files) {
      this.platform.loadFile(file.storageKey, file.content)
    }
  }

  createMessage(msg: TestMessage): Message {
    const message: Message = {
      id: uuidv4(),
      role: msg.role,
      contentParts: msg.content ? [{ type: 'text', text: msg.content }] : [],
      timestamp: Date.now(),
    }

    if (msg.files && msg.files.length > 0) {
      message.files = msg.files.map((f) => ({
        id: uuidv4(),
        name: f.fileName,
        fileType: f.fileType,
        storageKey: f.storageKey,
      }))
    }

    return message
  }

  clear(): void {
    this.platform.clear()
    this.sentry.clear()
  }
}

export interface TestRunnerOptions {
  /** License key for ChatboxAI */
  licenseKey: string
  outputDir: string
  defaultModelSettings?: Partial<SessionSettings>
  globalSettings?: Partial<Settings>
  verbose?: boolean
}

export class FileConversationTestRunner {
  private context: FileConversationTestContext
  private options: TestRunnerOptions
  private results: TestResult[] = []

  constructor(options: TestRunnerOptions) {
    this.options = options
    this.context = new FileConversationTestContext()

    if (!fs.existsSync(options.outputDir)) {
      fs.mkdirSync(options.outputDir, { recursive: true })
    }
  }

  async runTest(testCase: FileConversationTestCase): Promise<TestResult> {
    const startTime = Date.now()
    const toolCalls: TestResult['toolCalls'] = []

    console.log(`\n[Test] Running: ${testCase.name}`)
    if (testCase.description) {
      console.log(`  Description: ${testCase.description}`)
    }

    try {
      this.context.clear()

      this.context.loadFiles(testCase.files)
      console.log(`  Loaded ${testCase.files.length} file(s)`)

      const rawMessages: Message[] = testCase.messages.map((m) => this.context.createMessage(m))
      console.log(`  Created ${rawMessages.length} message(s)`)

      const globalSettings = this.buildGlobalSettings()
      const sessionSettings = this.buildSessionSettings(testCase.modelSettings)

      const dependencies = await this.context.createModelDependencies()

      const { getModel } = await import('../../../src/shared/models')
      const { streamText } = await import('../../../src/renderer/packages/model-calls/stream-text')
      const { genMessageContext } = await import('../../../src/renderer/stores/session/generation')

      const config = await this.context.platform.getConfig()

      const model = getModel(sessionSettings, globalSettings, config, dependencies)
      console.log(`  Using model: ${model.modelId}`)

      const testPlatform = this.context.platform
      const storageAdapter = {
        getBlob: async (key: string): Promise<string> => {
          const blob = await testPlatform.getStoreBlob(key)
          return blob ?? ''
        },
      }

      const modelSupportToolUseForFile = model.isSupportToolUse('read-file')
      const promptMessages = await genMessageContext(
        sessionSettings,
        rawMessages,
        modelSupportToolUseForFile,
        storageAdapter
      )
      console.log(
        `  genMessageContext: modelSupportToolUseForFile=${modelSupportToolUseForFile}, messages=${promptMessages.length}`
      )

      let streamResult: { result: StreamTextResult; coreMessages: ModelMessage[] } | undefined

      const originalPlatform = await this.replacePlatformForTest()

      const processedToolCallIds = new Set<string>()
      try {
        streamResult = await streamText(
          model,
          {
            messages: promptMessages,
            onResultChangeWithCancel: (result) => {
              if (result.contentParts) {
                for (const part of result.contentParts) {
                  if (part.type === 'tool-call' && part.state === 'result') {
                    const tc = part as any
                    if (tc.toolCallId && !processedToolCallIds.has(tc.toolCallId)) {
                      processedToolCallIds.add(tc.toolCallId)
                      toolCalls.push({
                        toolName: tc.toolName,
                        args: tc.args,
                        result: tc.result,
                      })
                    }
                  }
                }
              }
            },
          },
          undefined
        )
      } finally {
        await this.restorePlatform(originalPlatform)
      }
      const { result: response, coreMessages } = streamResult!

      const finalMessages = [...promptMessages]
      if (response) {
        const assistantMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          contentParts: response.contentParts || [],
          timestamp: Date.now(),
        }
        finalMessages.push(assistantMessage)
      }

      const duration = Date.now() - startTime
      const result: TestResult = {
        testName: testCase.name,
        success: true,
        messages: finalMessages,
        coreMessages,
        response,
        duration,
        toolCalls,
      }

      if (testCase.validate) {
        try {
          testCase.validate(result)
        } catch (validationError: any) {
          result.success = false
          result.error = `Validation failed: ${validationError.message}`
        }
      }

      console.log(`  ✓ Completed in ${duration}ms`)
      if (toolCalls.length > 0) {
        console.log(`  Tool calls: ${toolCalls.map((t) => t.toolName).join(', ')}`)
      }

      return result
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error(`  ✗ Failed: ${error.message}`)

      return {
        testName: testCase.name,
        success: false,
        error: error.message,
        messages: [],
        duration,
        toolCalls,
      }
    }
  }

  async runTests(testCases: FileConversationTestCase[]): Promise<TestResult[]> {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Running ${testCases.length} file conversation test(s)`)
    console.log(`${'='.repeat(60)}`)

    for (const testCase of testCases) {
      const result = await this.runTest(testCase)
      this.results.push(result)
    }

    this.printSummary()

    await this.exportResults()

    return this.results
  }

  private printSummary(): void {
    const passed = this.results.filter((r) => r.success).length
    const failed = this.results.length - passed
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)

    console.log(`\n${'='.repeat(60)}`)
    console.log(`Test Summary`)
    console.log(`${'='.repeat(60)}`)
    console.log(`Total: ${this.results.length}`)
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${failed}`)
    console.log(`Duration: ${totalDuration}ms`)

    if (failed > 0) {
      console.log(`\nFailed tests:`)
      for (const result of this.results.filter((r) => !r.success)) {
        console.log(`  - ${result.testName}: ${result.error}`)
      }
    }
  }

  async exportResults(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputPath = path.join(this.options.outputDir, `results-${timestamp}.json`)

    const exportData = {
      timestamp: new Date().toISOString(),
      options: {
        ...this.options,
        licenseKey: '***',
      },
      summary: {
        total: this.results.length,
        passed: this.results.filter((r) => r.success).length,
        failed: this.results.filter((r) => !r.success).length,
      },
      results: this.results.map((r) => ({
        ...r,
        messages: r.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.contentParts
            .filter((p) => p.type === 'text')
            .map((p) => (p as any).text)
            .join(''),
          files: m.files?.map((f) => ({ name: f.name, storageKey: f.storageKey })),
        })),
      })),
    }

    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2))
    console.log(`\nResults exported to: ${outputPath}`)
  }

  private buildGlobalSettings(): Settings {
    const baseSettings = {
      licenseKey: this.options.licenseKey,
      language: 'en' as const,
      ...this.options.globalSettings,
    }

    return baseSettings as Settings
  }

  private buildSessionSettings(overrides?: Partial<SessionSettings>): SessionSettings {
    return {
      provider: 'ChatboxAI',
      modelId: 'gpt-4o-mini',
      temperature: 0.7,
      topP: 1,
      maxContextMessageCount: 20,
      stream: true,
      ...this.options.defaultModelSettings,
      ...overrides,
    } as SessionSettings
  }

  private async replacePlatformForTest(): Promise<any> {
    return null
  }

  private async restorePlatform(original: any): Promise<void> {
    // no-op for now
  }
}

export interface RunConversationTestOptions {
  testName: string
  files: TestFile[]
  userMessage: string
  /** License key */
  licenseKey: string
  systemPrompt?: string
  validate?: (result: TestResult) => void
  sessionSettings?: Partial<SessionSettings>
  globalSettings?: Partial<Settings>
  platform?: TestPlatform
}

export async function runConversationTest(options: RunConversationTestOptions): Promise<TestResult> {
  const { testName, files, userMessage, licenseKey, validate, platform } = options
  const startTime = Date.now()
  const toolCalls: TestResult['toolCalls'] = []
  const processedToolCallIds = new Set<string>()

  console.log(`\n[Test] ${testName}`)

  try {
    const testPlatform = platform || new TestPlatform()

    for (const file of files) {
      testPlatform.loadFile(file.storageKey, file.content)
    }
    console.log(`  Loaded ${files.length} file(s)`)

    const rawMessages: Message[] = []

    if (options.systemPrompt) {
      const { createMessage } = await import('../../../src/shared/types')
      const systemMsg = createMessage('system', options.systemPrompt)
      rawMessages.push(systemMsg)
      console.log(`  Added system prompt (${options.systemPrompt.length} chars)`)
    }

    const userMsg = createUserMessageWithFiles(userMessage, files)
    rawMessages.push(userMsg)

    const globalSettings: Settings = {
      licenseKey,
      language: 'en',
      ...options.globalSettings,
    } as Settings

    const sessionSettings: SessionSettings = {
      provider: 'chatbox-ai',
      modelId: 'gpt-5-mini',
      temperature: 0.3,
      topP: 1,
      maxContextMessageCount: 20,
      stream: true,
      ...options.sessionSettings,
    } as SessionSettings

    const context = new FileConversationTestContext()
    context.platform = testPlatform
    const dependencies = await context.createModelDependencies()
    const config = await testPlatform.getConfig()

    const { getModel } = await import('../../../src/shared/models')
    const { streamText } = await import('../../../src/renderer/packages/model-calls/stream-text')
    const { genMessageContext } = await import('../../../src/renderer/stores/session/generation')

    const model = getModel(sessionSettings, globalSettings, config, dependencies)
    console.log(`  Using model: ${model.modelId}`)

    const storageAdapter = {
      getBlob: async (key: string): Promise<string> => {
        const blob = await testPlatform.getStoreBlob(key)
        return blob ?? ''
      },
    }

    const modelSupportToolUseForFile = model.isSupportToolUse('read-file')
    const promptMessages = await genMessageContext(
      sessionSettings,
      rawMessages,
      modelSupportToolUseForFile,
      storageAdapter
    )
    console.log(
      `  genMessageContext: modelSupportToolUseForFile=${modelSupportToolUseForFile}, messages=${promptMessages.length}`
    )

    const streamResult = await streamText(
      model,
      {
        messages: promptMessages,
        onResultChangeWithCancel: (result) => {
          if (result.contentParts) {
            for (const part of result.contentParts) {
              if (part.type === 'tool-call' && (part as any).state === 'result') {
                const tc = part as any
                if (tc.toolCallId && !processedToolCallIds.has(tc.toolCallId)) {
                  processedToolCallIds.add(tc.toolCallId)
                  toolCalls.push({
                    toolName: tc.toolName,
                    args: tc.args,
                    result: tc.result,
                  })
                }
              }
            }
          }
        },
      },
      undefined
    )
    const { result: response, coreMessages } = streamResult!

    const finalMessages = [...promptMessages]
    if (response) {
      const assistantMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        contentParts: response.contentParts || [],
        timestamp: Date.now(),
      }
      finalMessages.push(assistantMsg)
    }

    const duration = Date.now() - startTime
    const result: TestResult = {
      testName,
      success: true,
      messages: finalMessages,
      coreMessages,
      response,
      duration,
      toolCalls,
    }

    if (validate) {
      try {
        validate(result)
      } catch (err: any) {
        result.success = false
        result.error = `Validation failed: ${err.message}`
      }
    }

    console.log(`  ✓ Completed in ${duration}ms`)
    if (toolCalls.length > 0) {
      console.log(`  Tool calls: ${toolCalls.map((t) => t.toolName).join(', ')}`)
    }

    return result
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`  ✗ Failed: ${error.message}`)

    return {
      testName,
      success: false,
      error: error.message,
      messages: [],
      duration,
      toolCalls,
    }
  }
}

export function createTestFile(fileName: string, content: string, fileType: string = 'text/plain'): TestFile {
  return {
    storageKey: `file:test:${uuidv4()}`,
    fileName,
    fileType,
    content,
  }
}

export function loadTestFileFromDisk(filePath: string, fileType?: string): TestFile {
  const content = fs.readFileSync(filePath, 'utf-8')
  const fileName = path.basename(filePath)
  const detectedType = fileType || detectFileType(fileName)

  return createTestFile(fileName, content, detectedType)
}

function detectFileType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  const typeMap: Record<string, string> = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.js': 'text/javascript',
    '.ts': 'text/typescript',
    '.py': 'text/x-python',
    '.html': 'text/html',
    '.css': 'text/css',
    '.xml': 'text/xml',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
  }
  return typeMap[ext] || 'text/plain'
}
