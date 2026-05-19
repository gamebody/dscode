import { ExitCommand } from './build-in/exit';
import { ModelCommand } from './build-in/model';
import { ClearCommand } from './build-in/clear';
import { Command, CommandContext } from './command';
import { ConfigCommand } from './build-in/config';
import { ONEDesignCommand } from './build-in/one:design';
import { ONESaveDesignCommand } from './build-in/one:save-design';
import { ONEoneWritePlanCommand } from './build-in/one:write-plan';
import { ONEExecutePlanCommand } from './build-in/one:execute-plan';
import { InitCommand } from './build-in/init';
import { HelpCommand } from './build-in/help';


export class CommandRegistry {
  private commands: Command[] = [];
  
  constructor() {
    this.registerDefaultCommands();
  }
  
  private registerDefaultCommands() {
    this.register(new InitCommand());
    this.register(new ModelCommand());
    this.register(new ConfigCommand());
    this.register(new ClearCommand());
    this.register(new ExitCommand());
    this.register(new HelpCommand());
    this.register(new ONEDesignCommand());
    this.register(new ONESaveDesignCommand());
    this.register(new ONEoneWritePlanCommand());
    this.register(new ONEExecutePlanCommand());
  }
  
  register(command: Command) {
    this.commands.push(command);
  }
  
  findCommand(input: string): Command | undefined {
    return this.commands.find(cmd => cmd.matches(input));
  }
  
  getSuggestions(input: string): Array<{label: string, value: string}> {
    if (!input.startsWith('/')) {
      return [];
    }
    
    const suggestions: Array<{label: string, value: string}> = [];
    for (const command of this.commands) {
      if (command.getSuggestions) {
        suggestions.push(...command.getSuggestions(input));
      }
    }
    return suggestions;
  }
  
  async executeCommand(input: string, context: CommandContext): Promise<boolean> {
    const command = this.findCommand(input);
    if (command) {
      await command.execute(context, input);
      return true;
    }
    return false;
  }
  
  getAllCommands(): Command[] {
    return [...this.commands];
  }
}

export const commandRegistry = new CommandRegistry();
