import { BaseCommand, CommandContext } from "../command";

export class ConfigCommand extends BaseCommand {
  name = '/config';
  description = '展示当前配置';
  
  execute({ base, setText, pushUIMessage }: CommandContext, input?: string): void {

    pushUIMessage({
      role: 'user',
      content: `配置
${JSON.stringify(base, null, 2)}`
    })

    setText('');
  }
}
