import { tool } from "ai";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { createFileTree, listDirectory, MAX_FILES, printTree, TRUNCATED_MESSAGE } from "../utils/list.js";
import { CodeAgentContext } from "../agents/codeAgent.js";
import { safeStringify } from "../utils/safeStringify.js";
import { MaxFileReadLengthExceededError, MaxFileReadTokenExceededError } from "../utils/error.js";
import { countTokens } from 'gpt-tokenizer';
import { ApprovalCategory } from "../utils/constants.js";


const MAX_LINES_TO_READ = 2000;
const MAX_LINE_LENGTH = 2000;
const MAX_FILE_LENGTH = 262144;
const MAX_TOKENS = 25000;

const description = `
Reads a file from the local filesystem. You can access any file directly by using this tool.

Usage:
- By default, it reads up to ${MAX_LINES_TO_READ} lines starting from the beginning of the file
- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters
- Any lines longer than ${MAX_LINE_LENGTH} characters will be truncated
- This tool allows ONECODER to read images (eg PNG, JPG, etc). When reading an image file the contents are presented visually as ONECODER is a multimodal LLM.
      `

const inputSchema = z.object({
  file_path: z.string().describe('The absolute path to the file to read'),
  offset: z
    .number()
    .optional()
    .nullable()
    .describe(
      'The line number to start reading from. Only provide if the file is too large to read at once',
    ),
  limit: z
    .number()
    .optional()
    .nullable()
    .describe(
      `The number of lines to read. Only provide if the file is too large to read at once`,
    ),
});

const outputSchema = z.object({
  llmContent: z.string().describe("List of files and directories"),
});

export const readExecutor = async (input: z.infer<typeof inputSchema>, context: CodeAgentContext) => {
  const { file_path, offset, limit } = input;
  try {
    // Validate parameters
    if (offset !== undefined && offset !== null && offset < 1) {
      throw new Error('Offset must be >= 1');
    }
    if (limit !== undefined && limit !== null && limit < 1) {
      throw new Error('Limit must be >= 1');
    }

    const ext = path.extname(file_path).toLowerCase();

    const fullFilePath = (() => {
      if (path.isAbsolute(file_path)) {
        return file_path;
      }
      const full = path.resolve(context.cwd, file_path);
      if (fs.existsSync(full)) {
        return full;
      }
      if (file_path.startsWith('@')) {
        const full = path.resolve(context.cwd, file_path.slice(1));
        if (fs.existsSync(full)) {
          return full;
        }
      }
      throw new Error(`File ${file_path} does not exist.`);
    })();

    // Handle text files
    const {
      content,
      totalLines,
      startLine,
      actualLimit,
      selectedLines,
      endLine,
    } = readFileWithOffsetLimit(
      fullFilePath,
      offset ?? 1,
      limit ?? MAX_LINES_TO_READ,
    );

    if (content.length > MAX_FILE_LENGTH) {
      throw new MaxFileReadLengthExceededError(
        content.length,
        MAX_FILE_LENGTH,
      );
    }

    // token validation
    const tokenCount = countTokens(content);
    if (tokenCount > MAX_TOKENS) {
      throw new MaxFileReadTokenExceededError(tokenCount, MAX_TOKENS);
    }


    // Truncate long lines
    const truncatedLines = selectedLines.map((line) =>
      line.length > MAX_LINE_LENGTH
        ? `${line.substring(0, MAX_LINE_LENGTH)}...`
        : line,
    );

    const processedContent = truncatedLines.join('\n');
    const actualLinesRead = selectedLines.length;

    return {
      type: "tool-result" as const,
      returnDisplay:
        offset !== undefined || limit !== undefined
          ? `Read ${actualLinesRead} lines (from line ${startLine + 1} to ${endLine}).`
          : `Read ${actualLinesRead} lines.`,
      payload: {
        llmContent: safeStringify({
          type: 'text',
          filePath: file_path,
          content: processedContent,
          totalLines,
          offset: startLine + 1, // Convert back to 1-based
          limit: actualLimit,
          actualLinesRead,
        }),
      }


    };
  } catch (e) {
    return {
      isError: true,
      returnDisplay:  `Error: ${e instanceof Error ? e.message : String(e)}`,
      payload: {
        llmContent: e instanceof Error ? e.message : 'Unknown error',
      }
    };
  }
};

readExecutor.approval = {
  category: ApprovalCategory.READ,
}

export const readTool = tool({
  name: "read",
  description,
  inputSchema,
  outputSchema,
});

export type ReadTool = {
  name: 'read',
  input: z.infer<typeof inputSchema>,
  output: z.infer<typeof outputSchema>,
}






function readFileWithOffsetLimit(
  filePath: string,
  offset: number = 1,
  limit: number = MAX_LINES_TO_READ,
) {
  const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
  const allLines = fileContent.split(/\r?\n/);
  const totalLines = allLines.length;

  // Apply offset and limit with defaults
  const actualOffset = offset ?? 1;
  const actualLimit = limit ?? MAX_LINES_TO_READ;
  const startLine = Math.max(0, actualOffset - 1); // Convert 1-based to 0-based
  const endLine = Math.min(totalLines, startLine + actualLimit);
  const selectedLines = allLines.slice(startLine, endLine);

  return {
    content: selectedLines.join('\n'),
    lineCount: selectedLines.length,
    startLine,
    endLine,
    actualLimit,
    totalLines,
    selectedLines,
  };
}
