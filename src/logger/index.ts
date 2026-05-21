import { mkdir, appendFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import dayjs from 'dayjs'
import os from 'os'

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
    this.ensureFile()
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
      if (!existsSync(this.filePath)) {
        await writeFile(this.filePath, '', 'utf-8')
      }
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

}

export interface CrashInfo {
  timestamp: string
  type: 'uncaughtException' | 'unhandledRejection'
  error: {
    name: string
    message: string
    stack?: string
  }
  process: {
    pid: number
    uptime: number
    memoryUsage: NodeJS.MemoryUsage
    cwd: string
    argv: string[]
    version: string
  }
  system: {
    platform: string
    arch: string
    hostname: string
    username: string
    homedir: string
  }
}

export async function writeCrashLog(
  logsDir: string,
  error: Error | null,
  type: 'uncaughtException' | 'unhandledRejection',
): Promise<string> {
  const crashDir = join(logsDir, 'crashes')
  if (!existsSync(crashDir)) {
    await mkdir(crashDir, { recursive: true })
  }

  const now = dayjs()
  const filePath = join(crashDir, `crash-${now.format('YYYY-MM-DD-HH-mm-ss')}.json`)

  const crashInfo: CrashInfo = {
    timestamp: now.toISOString(),
    type,
    error: {
      name: error?.name ?? 'UnknownError',
      message: error?.message ?? 'No error message',
      stack: error?.stack,
    },
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cwd: process.cwd(),
      argv: process.argv,
      version: process.version,
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      username: os.userInfo().username,
      homedir: os.homedir(),
    },
  }

  await writeFile(filePath, JSON.stringify(crashInfo, null, 2), 'utf-8')
  return filePath
}
