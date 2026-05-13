import { BaseCommand } from "../command";

export class ExitCommand extends BaseCommand {
  name = '/exit';
  description = '退出应用程序';
  
  execute(): void {
    process.exit(0);
  }
}
