import { CodeAgentContext } from "../agents/codeAgent.js";
import { exec } from "child_process";
import { promisify } from "util";
import { ApprovalCategory, TOOL_NAMES } from "../utils/constants.js";
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";

const execAsync = promisify(exec);
const toolName = TOOL_NAMES.BASH;

export const bashToolSchema: ChatCompletionFunctionTool = {
  type: "function",
  function: {
    name: toolName,
    description: `Run shell commands in the terminal, ensuring proper handling and security measures.

Background Execution:
- Set run_in_background=true to force background execution
- Background tasks return a task_id for use with bash_output and kill_bash tools
- Initial output shown when moved to background

Before using this tool, please follow these steps:
- Verify that the command is not one of the banned commands: alias, aria2c, axel, bash, chrome, curl, curlie, eval, firefox, fish, http-prompt, httpie, links, lynx, nc, rm, safari, sh, source, telnet, w3m, wget, xh, zsh.
- Always quote file paths that contain spaces with double quotes (e.g., cd "path with spaces/file.txt")
- Capture the output of the command.

Notes:
- The command argument is required.
- You can specify an optional timeout in milliseconds (up to 600000ms / 10 minutes). If not specified, commands will timeout after 30 minutes.
- VERY IMPORTANT: You MUST avoid using search commands like \`find\` and \`grep\`. Instead use grep and glob tool to search. You MUST avoid read tools like \`cat\`, \`head\`, \`tail\`, and \`ls\`, and use \`read\` and \`ls\` tool to read files.
- If you _still_ need to run \`grep\`, STOP. ALWAYS USE ripgrep at \`rg\` first, which all users have pre-installed.
- When issuing multiple commands, use the ';' or '&&' operator to separate them. DO NOT use newlines (newlines are ok in quoted strings).
- Try to maintain your current working directory throughout the session by using absolute paths and avoiding usage of \`cd\`. You may use \`cd\` if the User explicitly requests it.
- Don't add \`<command>\` wrapper to the command.

<good-example>
pytest /foo/bar/tests
</good-example>
<bad-example>
cd /foo/bar && pytest tests
</bad-example>
<bad-example>
<command>pytest /foo/bar/tests</command>
</bad-example>`,
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The command to execute",
        },
        timeout: {
          type: "number",
          description: "Optional timeout in milliseconds (max 600000)",
          nullable: true,
        },
        run_in_background: {
          type: "boolean",
          description: "Set to true to run this command in the background. Use bash_output to read output later.",
        },
      },
      required: ["command"],
    },
  },
};

type Input = {
  command: string;
  timeout?: number | null;
  run_in_background?: boolean;
}

type Output = {
  llmContent: string;
}

const BANNED_COMMANDS = new Set([
  "alias", "aria2c", "axel", "bash", "chrome", "curl", "curlie", "eval",
  "firefox", "fish", "http-prompt", "httpie", "links", "lynx", "nc",
  "rm", "safari", "sh", "source", "telnet", "w3m", "wget", "xh", "zsh"
]);

function isCommandBanned(command: string): boolean {
  const firstWord = command.trim().split(/\\s+/)[0]!;
  return BANNED_COMMANDS.has(firstWord);
}

export const bashExecutor = async (input: Input, context: CodeAgentContext) => {
  const { command, timeout, run_in_background } = input;

  try {
    if (!command || command.trim() === "") {
      throw new Error("Command cannot be empty");
    }

    if (isCommandBanned(command)) {
      throw new Error(`Command '${command.split(/\\s+/)[0]}' is banned for security reasons`);
    }

    const options: any = {
      cwd: context.cwd,
      timeout: timeout ? timeout : 30 * 60 * 1000,
      maxBuffer: 1024 * 1024 * 10,
    };

    if (run_in_background) {
      const taskId = `bash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const childProcess = exec(command, options);

      if (!context.backgroundTasks) {
        context.backgroundTasks = {};
      }
      context.backgroundTasks[taskId] = {
        process: childProcess,
        startTime: Date.now(),
        command,
      };

      return {
        type: "tool-result" as const,
        returnDisplay: `Command started in background with task_id: ${taskId}`,
        payload: {
          llmContent: `Command started in background. Task ID: ${taskId}`,
        },
      };
    } else {
      const { stdout, stderr } = await execAsync(command, options);

      let output = "";
      if (stdout) output += stdout;
      if (stderr) output += (output ? "\\n" : "") + stderr;

      return {
        type: "tool-result" as const,
        returnDisplay: `Command executed successfully`,
        payload: {
          llmContent: output || "Command executed successfully (no output)",
        },
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      returnDisplay: `Error: ${errorMessage}`,
      payload: {
        llmContent: `Error executing command: ${errorMessage}`,
      },
    };
  }
};

bashExecutor.approval = {
  category: ApprovalCategory.COMMAND,
}

export type BashToolReturnDisplay = string;

export type BashTool = {
  name: 'bash',
  input: Input,
  output: Output,
}

