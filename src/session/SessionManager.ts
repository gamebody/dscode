import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { ModelMessage } from '../agent'
import { UIMessage } from '../store/agent'
import { LogEntry } from '../logger/index'

export interface SessionSummary {
  sessionId: string
  date: string
  filePath: string
  firstMessage: string
  messageCount: number
  firstTime: string
  lastTime: string
}

export interface ParsedSession {
  sessionId: string
  messages: ModelMessage[]
  uiMessages: UIMessage[]
}

export interface DateGroup {
  date: string
  sessions: SessionSummary[]
}

export class SessionManager {
  constructor(private logsDir: string) {}

  async scanSessions(): Promise<DateGroup[]> {
    if (!existsSync(this.logsDir)) return []

    const entries = await readdir(this.logsDir, { withFileTypes: true })
    const dateDirs = entries
      .filter(e => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
      .sort((a, b) => b.name.localeCompare(a.name))

    const groups: DateGroup[] = []

    for (const dir of dateDirs) {
      const datePath = join(this.logsDir, dir.name)
      const files = await readdir(datePath)
      const jsonlFiles = files.filter(f => f.endsWith('.jsonl'))

      const sessions: SessionSummary[] = []

      for (const file of jsonlFiles) {
        const filePath = join(datePath, file)
        const sessionId = file.replace('.jsonl', '')
        const lines = (await readFile(filePath, 'utf-8')).trim().split('\n').filter(Boolean)

        if (lines.length === 0) continue

        let firstTime = ''
        let lastTime = ''
        let firstMessage = ''

        for (let i = 0; i < lines.length; i++) {
          try {
            const line = lines[i]!
            const entry: LogEntry = JSON.parse(line)
            if (i === 0) firstTime = entry.t
            lastTime = entry.t

            if (entry.mm.role === 'user' && !firstMessage) {
              const raw = entry.mm.content
              const content = typeof raw === 'string'
                ? raw
                : raw ? JSON.stringify(raw) ?? '' : ''
              firstMessage = content
            }
          } catch {
            // skip corrupted lines
          }
        }

        sessions.push({
          sessionId,
          date: dir.name,
          filePath,
          firstMessage,
          messageCount: lines.length,
          firstTime,
          lastTime,
        })
      }

      sessions.sort((a, b) => b.lastTime.localeCompare(a.lastTime))

      if (sessions.length > 0) {
        groups.push({ date: dir.name, sessions })
      }
    }

    return groups
  }

  private async findSessionFile(sessionId: string): Promise<string | null> {
    if (!existsSync(this.logsDir)) return null

    const entries = await readdir(this.logsDir, { withFileTypes: true })
    const dateDirs = entries
      .filter(e => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))

    for (const dir of dateDirs) {
      const filePath = join(this.logsDir, dir.name, `${sessionId}.jsonl`)
      if (existsSync(filePath)) {
        return filePath
      }
    }

    return null
  }

  async loadSession(sessionId: string): Promise<ParsedSession> {
    const filePath = await this.findSessionFile(sessionId)
    if (!filePath) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    const raw = await readFile(filePath, 'utf-8')
    const lines = raw.trim().split('\n').filter(Boolean)

    const messages: ModelMessage[] = []
    const uiMessages: UIMessage[] = []

    const toolCallMap: Record<string, { name: string; input: unknown }> = {}

    for (const line of lines) {
      try {
        const entry: LogEntry = JSON.parse(line)
        const mm = entry.mm

        messages.push(mm)

        if (mm.role === 'user') {
          uiMessages.push({
            role: 'user',
            content: typeof mm.content === 'string' ? mm.content : JSON.stringify(mm.content),
          })
        } else if (mm.role === 'assistant') {
          const toolCalls: Array<{
            id: string; type: string;
            function: { name: string; arguments: string }
          }> | undefined = (mm as any).tool_calls

          if (toolCalls) {
            for (const tc of toolCalls) {
              if (tc.type === 'function') {
                let input: unknown = null
                try { input = JSON.parse(tc.function.arguments) } catch { input = {} }
                toolCallMap[tc.id] = { name: tc.function.name, input }
              }
            }
          }

          const reasoningContent = (mm as any).reasoning_content as string | undefined
          if (reasoningContent) {
            uiMessages.push({ role: 'thinking', content: reasoningContent })
          }
          if (mm.content) {
            uiMessages.push({
              role: 'assistant',
              content: typeof mm.content === 'string' ? mm.content : JSON.stringify(mm.content),
            })
          }
        } else if (mm.role === 'tool') {
          const toolCallId: string = (mm as any).tool_call_id || ''
          const tcInfo = toolCallMap[toolCallId]
          const toolName = tcInfo?.name || ''

          let output: string
          if (typeof mm.content === 'string') {
            try { output = JSON.parse(mm.content) } catch { output = mm.content }
          } else {
            output = JSON.stringify(mm.content)
          }

          uiMessages.push({
            role: 'tool',
            content: {
              toolCallId,
              toolName,
              name: toolName,
              input: tcInfo?.input ?? null,
              state: 'done' as const,
              returnDisplay: entry.returnDisplay,
              output,
            } as any,
          })
        }
      } catch {
        // skip corrupted lines
      }
    }

    return { sessionId, messages, uiMessages }
  }
}
