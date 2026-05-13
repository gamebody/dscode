import { BaseCommand, CommandContext } from "../command";

export class ModelCommand extends BaseCommand {
  name = '/model';
  description = '配置AI模型';
  
  execute(context: CommandContext, input?: string): void {
    const { setShowModelSelect, setText } = context;
    setShowModelSelect(true);
    setText('');
  }
}
