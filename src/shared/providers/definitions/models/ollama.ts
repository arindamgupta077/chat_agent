import type { ProviderModelInfo } from '../../../types'
import OpenAICompatible, { type OpenAICompatibleSettings } from '../../../models/openai-compatible'
import type { ModelDependencies } from '../../../types/adapters'
import { normalizeOpenAIApiHostAndPath } from '../../../utils/llm_utils'

const helpers = {
  isModelSupportVision: (model: string) => {
    return [
      'gemma3',
      'llava',
      'llama3.2-vision',
      'llava-llama3',
      'moondream',
      'bakllava',
      'llava-phi3',
      'granite3.2-vision',
      'qwen3',
    ].some((m) => model.startsWith(m))
  },
  isModelSupportToolUse: (model: string) => {
    return [
      'qwq',
      'llama3.3',
      'llama3.2',
      'llama3.1',
      'mistral',
      'qwen2.5',
      'qwen2.5-coder',
      'qwen2',
      'mistral-nemo',
      'mixtral',
      'smollm2',
      'mistral-small',
      'command-r',
      'hermes3',
      'mistral-large',
      'qwen3',
    ].some((m) => model.startsWith(m))
  },
}

interface OllamaOptions extends OpenAICompatibleSettings {
  ollamaHost: string
}

export default class Ollama extends OpenAICompatible {
  public name = 'Ollama'
  public options: OllamaOptions

  constructor(options: Omit<OllamaOptions, 'apiKey' | 'apiHost'>, dependencies: ModelDependencies) {
    const apiHost = normalizeOpenAIApiHostAndPath({ apiHost: options.ollamaHost }).apiHost
    super(
      {
        apiKey: 'ollama',
        apiHost,
        model: options.model,
        temperature: options.temperature,
        topP: options.topP,
        maxOutputTokens: options.maxOutputTokens,
        stream: options.stream,
        useProxy: options.useProxy,
      },
      dependencies
    )
    this.options = {
      ...options,
      apiKey: 'ollama',
      apiHost,
    }
  }
  public isSupportToolUse(): boolean {
    return helpers.isModelSupportToolUse(this.options.model.modelId) || super.isSupportToolUse()
  }
  public isSupportVision(): boolean {
    return helpers.isModelSupportVision(this.options.model.modelId) || super.isSupportVision()
  }

  public async listModels(): Promise<ProviderModelInfo[]> {
    const rawHost = (this.options.ollamaHost || 'http://127.0.0.1:11434').trim()
    const baseHost = rawHost.replace(/\/v1\/?$/, '').replace(/\/$/, '')

    // 1. First attempt: Query Ollama native /api/tags endpoint
    try {
      const tagsUrl = `${baseHost}/api/tags`
      const response = await this.dependencies.request.apiRequest({
        url: tagsUrl,
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        useProxy: this.options.useProxy,
      })
      const json = await response.json()
      if (Array.isArray(json?.models) && json.models.length > 0) {
        return json.models.map((item: any) => {
          const modelId: string = item.name || item.model
          const capabilities: ProviderModelInfo['capabilities'] = []
          if (helpers.isModelSupportVision(modelId)) {
            capabilities.push('vision')
          }
          if (helpers.isModelSupportToolUse(modelId)) {
            capabilities.push('tool_use')
          }
          const modelInfo: ProviderModelInfo = {
            modelId,
            nickname: item.name || item.model,
            type: 'chat',
          }
          if (capabilities.length > 0) {
            modelInfo.capabilities = capabilities
          }
          return modelInfo
        })
      }
    } catch (err) {
      console.warn('[Ollama] Failed to fetch models from /api/tags, trying /v1/models fallback:', err)
    }

    // 2. Second attempt: Query OpenAI-compatible /v1/models endpoint via super.listModels()
    try {
      const models = await super.listModels()
      if (models.length > 0) {
        return models.map((m) => {
          const capabilities: ProviderModelInfo['capabilities'] = [...(m.capabilities || [])]
          if (helpers.isModelSupportVision(m.modelId) && !capabilities.includes('vision')) {
            capabilities.push('vision')
          }
          if (helpers.isModelSupportToolUse(m.modelId) && !capabilities.includes('tool_use')) {
            capabilities.push('tool_use')
          }
          return {
            ...m,
            nickname: m.nickname || m.modelId,
            capabilities: capabilities.length > 0 ? capabilities : undefined,
          }
        })
      }
    } catch (err) {
      console.warn('[Ollama] Failed to fetch models from /v1/models:', err)
    }

    if (this.options.listModelsFallback) {
      return this.options.listModelsFallback
    }
    return []
  }
}

