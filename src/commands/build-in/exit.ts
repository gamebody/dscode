import { BaseCommand, CommandContext } from "../command";

export class ExitCommand extends BaseCommand {
  name = '/exit';
  description = '退出应用程序';
  
  execute(context: CommandContext): void {
    context.setIsStatusBarVisible(false);
    context.setExitConfirmState('exiting');
    setTimeout(() => {
      process.exit(0);
    }, 500);
  }
}
