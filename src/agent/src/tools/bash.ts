import { BackgroundTask, CodeAgentContext } from "../agents/codeAgent.js";
import { spawn } from "child_process";
import { ApprovalCategory, TOOL_NAMES } from "../utils/constants.js";
import type { ITool } from "./types.js";

type Input = {
  command?: string;
  timeout?: number | null;
  run_in_background?: boolean;
  task_id?: string;
  kill?: boolean;
};

type Output = {
  llmContent: string;
};

const BANNED_COMMANDS = new Set([
  "alias", "aria2c", "axel", "bash", "chrome", "curl", "curlie", "eval",
  "firefox", "fish", "http-prompt", "httpie", "links", "lynx", "nc",
  "rm", "safari", "sh", "source", "telnet", "w3m", "wget", "xh", "zsh"
]);

function isCommandBanned(command: string): boolean {
  const firstWord = command.trim().split(/\s+/)[0]!;
  return BANNED_COMMANDS.has(firstWord);
}

function spawnSync(
  command: string,
  cwd: string,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [], {
      cwd,
      shell: true,
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });
    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? -1 });
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

function buildTaskResultMessage(task: {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  command: string;
}): string {
  let output = "";
  if (task.stdout) output += task.stdout;
  if (task.stderr) output += (output ? "\n" : "") + task.stderr;
  return `Background task completed.\nCommand: ${task.command}\nExit code: ${task.exitCode}\nOutput:\n${output || "(no output)"}`;
}

export type BashToolReturnDisplay = string;

export type BashTool = {
  name: 'bash',
  input: Input,
  output: Output,
};

export const bashTool: ITool<Input> = {
  name: TOOL_NAMES.BASH,

  schema: {
    type: "function",
    function: {
      name: TOOL_NAMES.BASH,
      description: `Run shell commands in the terminal, ensuring proper handling and security measures.

Background Execution:
- Set run_in_background=true to force background execution
- Background tasks return a task_id immediately; their full output is automatically injected into the conversation when the process completes
- Use task_id with kill=true to terminate a running background task

Before using this tool, please follow these steps:
- Verify that the command is not one of the banned commands: alias, aria2c, axel, bash, chrome, curl, curlie, eval, firefox, fish, http-prompt, httpie, links, lynx, nc, rm, safari, sh, source, telnet, w3m, wget, xh, zsh.
- Always quote file paths that contain spaces with double quotes (e.g., cd "path with spaces/file.txt")
- Capture the output of the command.

Notes:
- The command argument is required for sync and background execution modes.
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
            description: "The command to execute. Required for sync and background modes. Omit when using task_id to check/kill an existing task.",
          },
          timeout: {
            type: "number",
            description: "Optional timeout in milliseconds (max 600000)",
            nullable: true,
          },
          run_in_background: {
            type: "boolean",
            description: "Set to true to run this command in the background. Use task_id with kill=true to terminate a running background task.",
          },
          task_id: {
            type: "string",
            description: "The task_id of a running background task. Use with kill=true to terminate, or alone to check current output.",
          },
          kill: {
            type: "boolean",
            description: "Set to true with a task_id to kill a running background task.",
          },
        },
        required: [],
      },
    },
  },

  approval: {
    category: ApprovalCategory.COMMAND,
  },

  executor: async (
    input: Input,
    context: CodeAgentContext,
  ) => {
    const { command, timeout, run_in_background, task_id, kill } = input;

    try {
      // ---- Kill background task ----
      if (task_id && kill) {
        if (!context.backgroundTasks?.[task_id]) {
          throw new Error(`Task '${task_id}' not found`);
        }
        const task = context.backgroundTasks[task_id];
        if (task.status === "completed" || task.status === "killed" || task.status === "error") {
          delete context.backgroundTasks[task_id];
          return {
            type: "tool-result" as const,
            returnDisplay: `Task ${task_id} already finished`,
            payload: {
              llmContent: buildTaskResultMessage(task),
            },
          };
        }

        task.process.kill("SIGTERM");
        task.status = "killed";

        const resultMessage = buildTaskResultMessage(task);
        delete context.backgroundTasks[task_id];

        return {
          type: "tool-result" as const,
          returnDisplay: `Task ${task_id} killed`,
          payload: {
            llmContent: resultMessage,
          },
        };
      }

      // ---- Check background task output (task_id without kill) ----
      if (task_id && !kill && !command) {
        if (!context.backgroundTasks?.[task_id]) {
          throw new Error(`Task '${task_id}' not found`);
        }
        const task = context.backgroundTasks[task_id];

        if (task.status === "completed" || task.status === "error" || task.status === "killed") {
          const resultMessage = buildTaskResultMessage(task);
          delete context.backgroundTasks[task_id];

          return {
            type: "tool-result" as const,
            returnDisplay: `Task ${task_id} finished (exit: ${task.exitCode})`,
            payload: {
              llmContent: resultMessage,
            },
          };
        }

        return {
          type: "tool-result" as const,
          returnDisplay: `Task ${task_id} still running`,
          payload: {
            llmContent: `Task still running.\nCurrent output:\n${task.stdout || "(no output yet)"}`,
          },
        };
      }

      // ---- Command modes (sync & background) ----
      if (!command || command.trim() === "") {
        throw new Error("Command cannot be empty");
      }

      if (isCommandBanned(command)) {
        throw new Error(
          `Command '${command.split(/\s+/)[0]}' is banned for security reasons`,
        );
      }

      const timeoutMs = timeout ? Math.min(timeout, 600000) : 30 * 60 * 1000;

      // ---- Background mode ----
      if (run_in_background) {
        const taskId = `bash_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        const child = spawn(command, [], {
          cwd: context.cwd,
          shell: true,
          timeout: timeoutMs,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        const task: BackgroundTask = {
          process: child,
          startTime: Date.now(),
          command,
          status: "running",
          stdout: "",
          stderr: "",
          exitCode: null as number | null,
        };

        child.stdout?.on("data", (data: Buffer) => {
          task.stdout += data.toString();
        });
        child.stderr?.on("data", (data: Buffer) => {
          task.stderr += data.toString();
        });

        child.on("close", (code) => {
          task.exitCode = code ?? -1;
          task.status = code === 0 ? "completed" : "error";
        });

        child.on("error", () => {
          task.status = "error";
        });

        if (!context.backgroundTasks) {
          context.backgroundTasks = {};
        }
        context.backgroundTasks[taskId] = task;

        return {
          type: "tool-result" as const,
          returnDisplay: `Command started in background with task_id: ${taskId}`,
          payload: {
            llmContent: `Command started in background.\nTask ID: ${taskId}\nCommand: ${command}\nOutput will appear automatically when the command completes.`,
          },
        };
      }

      // ---- Sync mode ----
      const { stdout, stderr, exitCode } = await spawnSync(command, context.cwd, timeoutMs);

      let output = "";
      if (stdout) output += stdout;
      if (stderr) output += (output ? "\n" : "") + stderr;

      return {
        type: "tool-result" as const,
        returnDisplay: `Command executed successfully (exit: ${exitCode})`,
        payload: {
          llmContent: output || "Command executed successfully (no output)",
        },
      };
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
  },
};
