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
            await context.restoreSession(session.filePath, sessionId)
            return
          }
        }
      }
      context.setResumeMode(true)
    } else {
      context.setResumeMode(true)
    }
  }
}
