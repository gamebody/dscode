import { ModelMessage } from "../agent";
import { UIMessage } from "../store/agent";
import { Base } from "../store/index";
import { SessionManager } from "../session/SessionManager";
import { codeAgent } from "../agent";

export interface CommandContext {
  setText: (text: string) => void;
  setVisible: (visible: boolean) => void;
  setShowModelSelect: (show: boolean) => void;
  pushUIMessage: (message: UIMessage) => void;
  appendMessage: (message: ModelMessage) => void;
  runLoop: () => void;
  base: Base
  clear: () => void;
  setExitConfirmState: (state: 'idle' | 'confirming' | 'exiting') => void;
  setIsStatusBarVisible: (visible: boolean) => void;
  setResumeMode: (mode: boolean) => void;
  sessionMgr: SessionManager;
  restoreSession: (filePath: string, sessionId: string) => Promise<void>;
}

export interface Command {
  name: string;
  description: string;
  matches(input: string): boolean;
  execute(context: CommandContext, input?: string): Promise<void> | void;
  getSuggestions?(input: string): Array<{label: string, value: string}>;
}


export abstract class BaseCommand implements Command {
  abstract name: string;
  abstract description: string;
  
  matches(input: string): boolean {
    return input.startsWith(this.name);
  }
  
  abstract execute(context: CommandContext, input?: string): Promise<void> | void;
  
  getSuggestions(input: string): Array<{label: string, value: string}> {
    if (this.name.startsWith(input)) {
      return [{
        label: `${this.name.padEnd(20)}${this.description}`,
        value: this.name
      }];
    }
    return [];
  }
}
