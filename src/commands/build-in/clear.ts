import { BaseCommand, CommandContext } from "../command";

export class ClearCommand extends BaseCommand {
  name = '/clear';
  description = '开始新会话';
  
  execute(context: CommandContext, input?: string): void {
    context.clear()
    context.setText('')
  }
}
