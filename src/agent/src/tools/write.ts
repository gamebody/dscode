import fs from "fs";
import path from "path";
import { CodeAgentContext } from "../agents/codeAgent.js";
import { ApprovalCategory, TOOL_NAMES } from "../utils/constants.js";
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";

const toolName = TOOL_NAMES.WRITE;

export const writeToolSchema: ChatCompletionFunctionTool = {
  type: "function",
  function: {
    name: toolName,
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
};

type Input = {
  file_path: string;
  content: string;
}

type Output = {
  llmContent: string;
}

function resolveWriteFilePath(filePath: string, cwd: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);
}
function formatContent(content: string): string {
  if (!content.endsWith('\n')) {
    return content + '\n';
  }
  return content;
}

export const writeExecutor = async (input: Input, context: CodeAgentContext) => {
  const { file_path, content } = input;
  try {
    const fullFilePath = resolveWriteFilePath(file_path, context.cwd);

    // Check if file exists and read old content (using fs)
    const oldFileExists = fs.existsSync(fullFilePath);
    const oldContent = oldFileExists
      ? fs.readFileSync(fullFilePath, 'utf-8')
      : '';

    // Create directory and write file (using fs)
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
      }
    };
  } catch (e) {
    return {
      isError: true,
      returnDisplay:  e instanceof Error ? e.message : 'Unknown error',
      payload: {
        llmContent: e instanceof Error ? e.message : 'Unknown error',
      }
    };
  }
};

writeExecutor.approval = {
  category: ApprovalCategory.WRITE,
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
}

function format(content: string) {
  if (!content.endsWith('\\n')) {
    return content + '\\n';
  }
  return content;
}
