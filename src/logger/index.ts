import { mkdir, appendFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

export interface LogEntry {
  timestamp: string
  sessionId: string
  type: 'message' | 'response'
  data: unknown
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

  private getDateStr(): string {
    const d = new Date()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mm}-${dd}`
  }

  private async ensureFile(): Promise<string> {
    if (this.filePath) return this.filePath
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      const dateStr = this.getDateStr()
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
