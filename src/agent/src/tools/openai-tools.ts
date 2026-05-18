/**
 * OpenAI 格式的工具定义
 * 由 src/agent/src/tools/ 下的工具定义转换而来
 */

import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const openaiTools: ChatCompletionTool[] = [
  // ==================== read ====================
  {
    type: "function",
    function: {
      name: "read",
      description: `Reads a file from the local filesystem. You can access any file directly by using this tool.

Usage:
- By default, it reads up to 2000 lines starting from the beginning of the file
- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters
- Any lines longer than 2000 characters will be truncated
- This tool allows ONECODER to read images (eg PNG, JPG, etc). When reading an image file the contents are presented visually as ONECODER is a multimodal LLM.`,
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "The absolute path to the file to read",
          },
          offset: {
            type: "number",
            description:
              "The line number to start reading from. Only provide if the file is too large to read at once",
            nullable: true,
          },
          limit: {
            type: "number",
            description:
              "The number of lines to read. Only provide if the file is too large to read at once",
            nullable: true,
          },
        },
        required: ["file_path"],
      },
    },
  },

  // ==================== write ====================
  {
    type: "function",
    function: {
      name: "write",
      description: "Write a file to the local filesystem",
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "The absolute path to the file to write",
          },
          content: {
            type: "string",
            description: "The content to write to the file",
          },
        },
        required: ["file_path", "content"],
      },
    },
  },

  // ==================== edit ====================
  {
    type: "function",
    function: {
      name: "edit",
      description: `Edit files in the local filesystem.
Usage:
- You must use your read tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file.
- When editing text from Read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is: spaces + line number + tab. Everything after that tab is the actual file content to match. Never include any part of the line number prefix in the old_string or new_string.
- For moving or renaming files, you should generally use the Bash tool with the 'mv' command instead.
- For larger edits, use the Write tool to overwrite files.
- For file creation, use the Write tool.
- When making multiple file edits in a row to the same file, you should prefer to send all edits in a single message with multiple calls to this tool, rather than multiple messages with a single call each.`,
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "The path of the file to modify",
          },
          old_string: {
            type: "string",
            description: "The text to replace",
          },
          new_string: {
            type: "string",
            description: "The text to replace the old_string with",
          },
          replace_all: {
            type: "boolean",
            description:
              "Whether to replace all occurrences of old_string with new_string",
            default: false,
          },
        },
        required: ["file_path", "old_string", "new_string"],
      },
    },
  },

  // ==================== bash ====================
  {
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
  },

  // ==================== glob ====================
  {
    type: "function",
    function: {
      name: "glob",
      description: `Glob
- Fast file pattern matching tool that works with any codebase size
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name patterns`,
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: "The glob pattern to match files against",
          },
          path: {
            type: "string",
            description: "The directory to search in",
            nullable: true,
          },
        },
        required: ["pattern"],
      },
    },
  },

  // ==================== ls ====================
  {
    type: "function",
    function: {
      name: "ls",
      description:
        "Use this tool to list files and directories in a given path.",
      parameters: {
        type: "object",
        properties: {
          dir_path: {
            type: "string",
            description: "The path to the directory to list.",
          },
        },
        required: ["dir_path"],
      },
    },
  },

  // ==================== todoWrite ====================
  {
    type: "function",
    function: {
      name: "todoWrite",
      description: `Use this tool to create and manage a structured task list for your current coding session. This helps you track progress, organize complex tasks, and demonstrate thoroughness to the user.
It also helps the user understand the progress of the task and overall progress of their requests.

## When to Use This Tool
Use this tool proactively in these scenarios:

1. Complex multi-step tasks - When a task requires 3 or more distinct steps or actions
2. Non-trivial and complex tasks - Tasks that require careful planning or multiple operations
3. User explicitly requests todo list - When the user directly asks you to use the todo list
4. User provides multiple tasks - When users provide a list of things to be done (numbered or comma-separated)
5. After receiving new instructions - Immediately capture user requirements as todos
6. When you start working on a task - Mark it as in_progress BEFORE beginning work. Ideally you should only have one todo as in_progress at a time
7. After completing a task - Mark it as completed and add any new follow-up tasks discovered during implementation

## When NOT to Use This Tool

Skip using this tool when:
1. There is only a single, straightforward task
2. The task is trivial and tracking it provides no organizational benefit
3. The task can be completed in less than 3 trivial steps
4. The task is purely conversational or informational

NOTE that you should not use this tool if there is only one trivial task to do. In this case you are better off just doing the task directly.`,
      parameters: {
        type: "object",
        properties: {
          todos: {
            type: "array",
            description: "The updated todo list",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "Unique identifier for the todo item",
                },
                content: {
                  type: "string",
                  minLength: 1,
                  description: "The task description",
                },
                status: {
                  type: "string",
                  enum: ["pending", "in_progress", "completed"],
                  description: "The status of the task",
                },
                priority: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                  description: "The priority of the task",
                },
              },
              required: ["id", "content", "status", "priority"],
            },
          },
        },
        required: ["todos"],
      },
    },
  },

  // ==================== todoRead ====================
  {
    type: "function",
    function: {
      name: "todoRead",
      description: `Use this tool to read the current todo list. You can use this tool to:
1. Check the current state of the todo list
2. Verify which tasks are completed, in progress, or pending`,
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },

  // ==================== askUserQuestion ====================
  {
    type: "function",
    function: {
      name: "askUserQuestion",
      description: `Use this tool when you need to ask the user questions during execution. This allows you to:
1. Gather user preferences or requirements
2. Clarify ambiguous instructions
3. Get decisions on implementation choices as you work
4. Offer choices to the user about what direction to take.

Usage notes:
- Users will always be able to select "Other" to provide custom text input
- Use multiSelect: true to allow multiple answers to be selected for a question
- If you recommend a specific option, make that the first option in the list and add "(Recommended)" at the end of the label`,
      parameters: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            description: "Questions to ask the user (1-4 questions)",
            minItems: 1,
            maxItems: 4,
            items: {
              type: "object",
              properties: {
                question: {
                  type: "string",
                  description:
                    'The complete question to ask the user. Should be clear, specific, and end with a question mark. Example: "Which library should we use for date formatting?" If multiSelect is true, phrase it accordingly, e.g. "Which features do you want to enable?"',
                },
                header: {
                  type: "string",
                  maxLength: 12,
                  description:
                    'Very short label displayed as a chip/tag (max 12 chars). Examples: "Auth method", "Library", "Approach".',
                },
                options: {
                  type: "array",
                  description:
                    "The available choices for this question. Must have 2-4 options. Each option should be a distinct, mutually exclusive choice (unless multiSelect is enabled). There should be no 'Other' option, that will be provided automatically.",
                  minItems: 2,
                  maxItems: 4,
                  items: {
                    type: "object",
                    properties: {
                      label: {
                        type: "string",
                        description:
                          "The display text for this option that the user will see and select. Should be concise (1-5 words) and clearly describe the choice.",
                      },
                      description: {
                        type: "string",
                        description:
                          "Explanation of what this option means or what will happen if chosen. Useful for providing context about trade-offs or implications.",
                      },
                    },
                    required: ["label", "description"],
                  },
                },
                multiSelect: {
                  type: "boolean",
                  description:
                    "Set to true to allow the user to select multiple options instead of just one. Use when choices are not mutually exclusive.",
                  default: false,
                },
              },
              required: ["question", "header", "options"],
            },
          },
        },
        required: ["questions"],
      },
    },
  },
];
