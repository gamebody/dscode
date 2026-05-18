import { mkdir, appendFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import dayjs from 'dayjs'

export interface LogEntry {
  timestamp: string
  sessionId: string
  type: 'message' | 'response'
  data: unknown
}

export function getDateStr(): string {
  return dayjs().format('YYYY-MM-DD')
}

export class MessageLogger {
  private baseDir: string
  private sessionId: string
  private filePath: string | null = null
  private initPromise: Promise<string> | null = null

  constructor(baseDir: string, sessionId: string) {
    this.baseDir = baseDir
    this.sessionId = sessionId
  }

  private async ensureFile(): Promise<string> {
    if (this.filePath) return this.filePath
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      const dateStr = getDateStr()
      const dir = join(this.baseDir, dateStr)
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true })
      }
      this.filePath = join(dir, `${this.sessionId}.jsonl`)
      return this.filePath
    })()

    return this.initPromise
  }

  async log(entry: Omit<LogEntry, 'timestamp'>): Promise<void> {
    const filePath = await this.ensureFile()
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...entry,
    }) + '\n'
    await appendFile(filePath, line, 'utf-8')
  }

  async logMessage(message: unknown): Promise<void> {
    await this.log({ type: 'message', sessionId: this.sessionId, data: message })
  }

  async logResponse(response: unknown): Promise<void> {
    await this.log({ type: 'response', sessionId: this.sessionId, data: response })
  }
}
