import fs from "fs";
import path from "path";
import { CodeAgentContext } from "../agents/codeAgent.js";
import { ApprovalCategory } from "../utils/constants.js";
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";

const toolName = 'write';

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

export const writeExecutor = async (input: Input, context: CodeAgentContext) => {
  const { file_path, content } = input;
  try {
    const fullFilePath = path.isAbsolute(file_path)
      ? file_path
      : path.resolve(context.cwd, file_path);
    const oldFileExists = fs.existsSync(fullFilePath);
    const oldContent = oldFileExists
      ? fs.readFileSync(fullFilePath, 'utf-8')
      : '';
    const dir = path.dirname(fullFilePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullFilePath, format(content));
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

export type WriteTool = {
  name: 'write',
  input: Input,
  output: Output,
}

function format(content: string) {
  if (!content.endsWith('\n')) {
    return content + '\n';
  }
  return content;
}
