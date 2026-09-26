import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import dayjs from 'dayjs'

const LOG_FILE_NAME = 'agentlab-app.log'
const LOG_DIRECTORY = Directory.Data
const MAX_LOG_SIZE = 5 * 1024 * 1024
const MAX_LOG_AGE_DAYS = 30

export class MobileLogger {
  private static instance: MobileLogger
  private logBuffer: string[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private isInitialized = false

  private constructor() {}

  public static getInstance(): MobileLogger {
    if (!MobileLogger.instance) {
      MobileLogger.instance = new MobileLogger()
    }
    return MobileLogger.instance
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return

    try {
      await this.checkAndRotateLog()
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize mobile logger:', error)
    }
  }

  private async checkAndRotateLog(): Promise<void> {
    try {
      const stat = await Filesystem.stat({
        path: LOG_FILE_NAME,
        directory: LOG_DIRECTORY,
      })

      if (stat.size > MAX_LOG_SIZE) {
        await this.rotateLog()
      }

      if (stat.ctime) {
        const logAge = dayjs().diff(dayjs(stat.ctime), 'day')
        if (logAge > MAX_LOG_AGE_DAYS) {
          await this.clearLogs()
        }
      }
    } catch (error) {}
  }

  private async rotateLog(): Promise<void> {
    try {
      const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
      const backupName = `agentlab-app-${timestamp}.log`

      await Filesystem.rename({
        from: LOG_FILE_NAME,
        to: backupName,
        directory: LOG_DIRECTORY,
      })

      await this.cleanupOldBackups()
    } catch (error) {
      console.error('Failed to rotate log:', error)
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const result = await Filesystem.readdir({
        path: '',
        directory: LOG_DIRECTORY,
      })

      const logBackups = result.files
        .filter(
          (file) =>
            (file.name.startsWith('agentlab-app-') || file.name.startsWith('chatbox-app-')) &&
            file.name.endsWith('.log')
        )
        .sort((a, b) => (b.mtime || 0) - (a.mtime || 0))

      const toDelete = logBackups.slice(3)
      for (const file of toDelete) {
        await Filesystem.deleteFile({
          path: file.name,
          directory: LOG_DIRECTORY,
        })
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error)
    }
  }

  public log(level: string, message: string): void {
    const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss.SSS')
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`

    console.log(`APP_LOG: [${level}] ${message}`)

    this.logBuffer.push(logEntry)

    this.scheduleFlush()
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return

    this.flushTimer = setTimeout(() => {
      this.flush()
    }, 500)
  }

  private async flush(): Promise<void> {
    this.flushTimer = null

    if (this.logBuffer.length === 0) return

    const content = this.logBuffer.join('')
    this.logBuffer = []

    try {
      await Filesystem.appendFile({
        path: LOG_FILE_NAME,
        data: content,
        directory: LOG_DIRECTORY,
        encoding: Encoding.UTF8,
      })
    } catch (error) {
      try {
        await Filesystem.writeFile({
          path: LOG_FILE_NAME,
          data: content,
          directory: LOG_DIRECTORY,
          encoding: Encoding.UTF8,
          recursive: true,
        })
      } catch (writeError) {
        console.error('Failed to write log file:', writeError)
      }
    }
  }

  public async flushNow(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    await this.flush()
  }

  public async exportLogs(): Promise<string> {
    await this.flushNow()

    try {
      const result = await Filesystem.readFile({
        path: LOG_FILE_NAME,
        directory: LOG_DIRECTORY,
        encoding: Encoding.UTF8,
      })
      return result.data as string
    } catch (error) {
      console.error('Failed to read log file:', error)
      return ''
    }
  }

  public async clearLogs(): Promise<void> {
    this.logBuffer = []
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    try {
      await Filesystem.deleteFile({
        path: LOG_FILE_NAME,
        directory: LOG_DIRECTORY,
      })
    } catch (error) {}
  }

  public async getLogFilePath(): Promise<string> {
    try {
      const result = await Filesystem.getUri({
        path: LOG_FILE_NAME,
        directory: LOG_DIRECTORY,
      })
      return result.uri
    } catch (error) {
      return ''
    }
  }
}

export default MobileLogger.getInstance()
