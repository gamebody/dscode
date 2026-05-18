import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const bashTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "bash",
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
          description:
            "Optional timeout in milliseconds (max 600000)",
          nullable: true,
        },
        run_in_background: {
          type: "boolean",
          description:
            "Set to true to run this command in the background. Use bash_output to read output later.",
        },
      },
      required: ["command"],
    },
  },
};
