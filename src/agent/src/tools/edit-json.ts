import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const editTool: ChatCompletionTool = {
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
};
