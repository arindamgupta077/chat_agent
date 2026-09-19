import dayjs from 'dayjs'
import localforage from 'localforage'

const LOG_STORAGE_KEY = 'chatbox-app-logs'
const MAX_LOG_ENTRIES = 1000
const MAX_LOG_AGE_DAYS = 30

interface LogEntry {
  timestamp: string
  level: string
  message: string
}

export class WebLogger {
  private static instance: WebLogger
  private logBuffer: LogEntry[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private isInitialized = false

  private constructor() {}

  public static getInstance(): WebLogger {
    if (!WebLogger.instance) {
      WebLogger.instance = new WebLogger()
    }
    return WebLogger.instance
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return

    try {
      await this.cleanupOldLogs()
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize web logger:', error)
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const logs = await this.getStoredLogs()
      if (logs.length === 0) return

      const cutoffDate = dayjs().subtract(MAX_LOG_AGE_DAYS, 'day')
      const filteredLogs = logs.filter((log) => {
        const logDate = dayjs(log.timestamp)
        return logDate.isAfter(cutoffDate)
      })

      const trimmedLogs = filteredLogs.slice(-MAX_LOG_ENTRIES)

      if (trimmedLogs.length !== logs.length) {
        await localforage.setItem(LOG_STORAGE_KEY, trimmedLogs)
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error)
    }
  }

  private async getStoredLogs(): Promise<LogEntry[]> {
    try {
      const logs = await localforage.getItem<LogEntry[]>(LOG_STORAGE_KEY)
      return logs || []
    } catch (error) {
      return []
    }
  }

  public log(level: string, message: string): void {
    const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss.SSS')

    console.log(`APP_LOG: [${level}] ${message}`)

    this.logBuffer.push({ timestamp, level: level.toUpperCase(), message })

    this.scheduleFlush()
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return

    this.flushTimer = setTimeout(() => {
      this.flush()
    }, 1000)
  }

  private async flush(): Promise<void> {
    this.flushTimer = null

    if (this.logBuffer.length === 0) return

    const newLogs = [...this.logBuffer]
    this.logBuffer = []

    try {
      const existingLogs = await this.getStoredLogs()
      const allLogs = [...existingLogs, ...newLogs]

      const trimmedLogs = allLogs.slice(-MAX_LOG_ENTRIES)

      await localforage.setItem(LOG_STORAGE_KEY, trimmedLogs)
    } catch (error) {
      console.error('Failed to save logs:', error)
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
      const logs = await this.getStoredLogs()
      return logs.map((log) => `[${log.timestamp}] [${log.level}] ${log.message}`).join('\n')
    } catch (error) {
      console.error('Failed to export logs:', error)
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
      await localforage.removeItem(LOG_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }
}

export default WebLogger.getInstance()
