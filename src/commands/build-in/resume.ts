import { BaseCommand, CommandContext } from '../command'

export class ResumeCommand extends BaseCommand {
  name = '/resume'
  description = '恢复之前的会话'

  async execute(context: CommandContext, input?: string): Promise<void> {
    const sessionId = input?.substring(this.name.length).trim()

    if (sessionId) {
      context.resumeFn(sessionId)
    } else {
      context.pushUIMessage({
        role: 'error',
        content: `未找到会话: ${sessionId}`,
      })
    }
  }
}
