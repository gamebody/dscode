import { CodeAgentContext } from "../agents/codeAgent.js";
import path from 'pathe';
import fs from 'fs';
import { applyEdits } from "../utils/applyEdit.js";
import { ApprovalCategory, TOOL_NAMES } from "../utils/constants.js";
import type { ITool } from "./types.js";

type Input = {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
};

type Output = {
  llmContent: string;
};

export type EditToolReturnDisplay = {
  type: 'diff_viewer';
  filePath: string;
  originalContent: { inputKey: string };
  newContent: { inputKey: string };
  absoluteFilePath: string;
  startLineNumber: number;
} | string;

export type EditTool = {
  name: 'edit',
  input: Input,
  output: Output,
};

export const editTool: ITool<Input> = {
  name: TOOL_NAMES.EDIT,

  schema: {
    type: "function",
    function: {
      name: TOOL_NAMES.EDIT,
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
            description: "Whether to replace all occurrences of old_string with new_string",
            default: false,
          },
        },
        required: ["file_path", "old_string", "new_string"],
      },
    },
  },

  approval: {
    category: ApprovalCategory.WRITE,
  },

  executor: async (input: Input, context: CodeAgentContext) => {
    const { file_path, old_string, new_string, replace_all } = input;
    try {
      const cwd = context.cwd;
      const fullFilePath = path.isAbsolute(file_path)
        ? file_path
        : path.resolve(cwd, file_path);
      const relativeFilePath = path.relative(cwd, fullFilePath);
      const { patch, updatedFile, startLineNumber } = applyEdits(
        cwd,
        fullFilePath,
        [{ old_string, new_string, replace_all }],
      );
      const dir = path.dirname(fullFilePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullFilePath, updatedFile, 'utf-8');
      return {
        type: "tool-result" as const,
        payload: {
          llmContent: `File ${file_path} successfully edited.`,
        },
        returnDisplay: {
          type: 'diff_viewer',
          filePath: relativeFilePath,
          originalContent: { inputKey: 'old_string' },
          newContent: { inputKey: 'new_string' },
          absoluteFilePath: fullFilePath,
          startLineNumber,
        },
      };
    } catch (e) {
      return {
        isError: true,
        returnDisplay: e instanceof Error ? e.message : 'Unknown error',
        payload: {
          llmContent: e instanceof Error ? e.message : 'Unknown error',
        },
      };
    }
  },
};
