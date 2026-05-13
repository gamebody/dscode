import { tool } from "ai";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { CodeAgentContext } from "../agents/codeAgent.js";
import { ApprovalCategory } from "../utils/constants.js";

const description = `Write a file to the local filesystem`;

const inputSchema = z.object({
  file_path: z.string(),
  content: z.string(),
});

const outputSchema = z.object({
  llmContent: z.string().describe("LLM output"),
});

export const writeExecutor = async (input: z.infer<typeof inputSchema>, context: CodeAgentContext) => {
  const { file_path, content } = input;
  try {
    const fullFilePath = path.isAbsolute(file_path)
      ? file_path
      : path.resolve(context.cwd, file_path);
    const oldFileExists = fs.existsSync(fullFilePath);
    const oldContent = oldFileExists
      ? fs.readFileSync(fullFilePath, 'utf-8')
      : '';
    // TODO: backup old content
    // TODO: let user know if they want to write to a file that already exists
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

export const writeTool = tool({
  name: "write",
  description,
  inputSchema,
  outputSchema,
});

export type WriteTool = {
  name: 'write',
  input: z.infer<typeof inputSchema>,
  output: z.infer<typeof outputSchema>,
}



function format(content: string) {
  if (!content.endsWith('\n')) {
    return content + '\n';
  }
  return content;
}


