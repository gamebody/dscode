import { BaseCommand, CommandContext } from "../command";

export class NewCommand extends BaseCommand {
  name = '/new';
  description = '新建会话';
  
  execute(context: CommandContext, input?: string): void {
    context.clear()
    context.setText('')
  }
}
