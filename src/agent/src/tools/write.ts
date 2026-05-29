import fs from "fs";
import path from "path";
import { CodeAgentContext } from "../agents/codeAgent.js";
import { ApprovalCategory, TOOL_NAMES } from "../utils/constants.js";
import type { ITool } from "./types.js";

type Input = {
  file_path: string;
  content: string;
};

type Output = {
  llmContent: string;
};

function resolveWriteFilePath(filePath: string, cwd: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);
}

function formatContent(content: string): string {
  if (!content.endsWith('\n')) {
    return content + '\n';
  }
  return content;
}

export type WriteToolReturnDisplay = {
  type: 'diff_viewer';
  filePath: string;
  absoluteFilePath: string;
  originalContent: string;
  newContent: { inputKey: string };
  writeType: 'replace' | 'add';
} | string;

export type WriteTool = {
  name: 'write',
  input: Input,
  output: Output,
};

export const writeTool: ITool<Input> = {
  name: TOOL_NAMES.WRITE,

  schema: {
    type: "function",
    function: {
      name: TOOL_NAMES.WRITE,
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

  approval: {
    category: ApprovalCategory.WRITE,
  },

  executor: async (input: Input, context: CodeAgentContext) => {
    const { file_path, content } = input;
    try {
      const fullFilePath = resolveWriteFilePath(file_path, context.cwd);

      const oldFileExists = fs.existsSync(fullFilePath);
      const oldContent = oldFileExists
        ? fs.readFileSync(fullFilePath, 'utf-8')
        : '';

      const dir = path.dirname(fullFilePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullFilePath, formatContent(content));

      return {
        type: "tool-result" as const,
        returnDisplay: {
          type: 'diff_viewer',
          filePath: path.relative(context.cwd, fullFilePath),
          absoluteFilePath: fullFilePath,
          originalContent: oldContent,
          newContent: { inputKey: 'content' },
          writeType: oldFileExists ? 'replace' : 'add',
        },
        payload: {
          llmContent: `File successfully written to ${file_path}`,
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
