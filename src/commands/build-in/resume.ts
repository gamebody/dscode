import { BaseCommand, CommandContext } from '../command'

export class ResumeCommand extends BaseCommand {
  name = '/resume'
  description = '恢复之前的会话'

  async execute(context: CommandContext, input?: string): Promise<void> {
    const sessionId = input?.slice(this.name.length).trim()
    if (sessionId) {
      const sessionMgr = context.sessionMgr
      const groups = await sessionMgr.scanSessions()
      for (const group of groups) {
        for (const session of group.sessions) {
          if (session.sessionId === sessionId) {
            context.setStatusText(`正在恢复会话 ${sessionId}...`)
            await context.restoreSession(session.filePath, sessionId)
            context.setStatusText(`会话 ${sessionId} 已恢复`)
            return
          }
        }
      }
      context.setStatusText(`未找到会话 ${sessionId}`)
      context.setResumeMode(true)
    } else {
      context.setResumeMode(true)
    }
  }
}
