import fs from "fs";
import path from "path";
import { CodeAgentContext } from "../agents/codeAgent.js";
import { MaxFileReadLengthExceededError, MaxFileReadTokenExceededError } from "../utils/error.js";
import { ApprovalCategory, TOOL_NAMES } from "../utils/constants.js";
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";
import { checkFileType, createEmptyFileResult, createReadResult, estimatePartialReadSize, isImageFile, processFileContent, processImage, resolveFilePath, validateAndTruncateContent, validateFileSize, validateReadParams } from "../utils/read.shared.js";

const MAX_LINES_TO_READ = 2000;
const MAX_LINE_LENGTH = 2000;
const MAX_FILE_LENGTH = 262144;

const toolName = TOOL_NAMES.READ;

export const readToolSchema: ChatCompletionFunctionTool = {
  type: "function",
  function: {
    name: toolName,
    description: `Reads a file from the local filesystem. You can access any file directly by using this tool.

Usage:
- By default, it reads up to ${MAX_LINES_TO_READ} lines starting from the beginning of the file
- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters
- Any lines longer than ${MAX_LINE_LENGTH} characters will be truncated
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
          description: "The line number to start reading from. Only provide if the file is too large to read at once",
          nullable: true,
        },
        limit: {
          type: "number",
          description: "The number of lines to read. Only provide if the file is too large to read at once",
          nullable: true,
        },
      },
      required: ["file_path"],
    },
  },
};

type Input = {
  file_path: string;
  offset?: number;
  limit?: number;
}

type Output = {
  llmContent: string;
}

export const readExecutor = async (input: Input, context: CodeAgentContext) => {
  const { file_path, offset, limit } = input;
  try {
    validateReadParams(offset, limit);

    const ext = path.extname(file_path).toLowerCase();
    checkFileType(ext, file_path);

    const fullFilePath = resolveFilePath(file_path, context.cwd);

    // Get file stats once and reuse throughout
    const stats = fs.statSync(fullFilePath);

    // Level 1: Pre-check validation
    const isPartialRead = offset !== undefined || limit !== undefined;

    if (!isImageFile(ext)) {
      if (isPartialRead) {
        // For partial reads, estimate the size of content that will be read
        const estimatedSize = estimatePartialReadSize(
          fullFilePath,
          limit ?? MAX_LINES_TO_READ,
        );

        // If we can estimate and it's too large, fail fast
        if (estimatedSize !== null && estimatedSize > MAX_FILE_LENGTH) {
          throw new MaxFileReadLengthExceededError(
            estimatedSize,
            MAX_FILE_LENGTH,
          );
        }
      } else {
        // For full file reads, check the actual file size
        if (!validateFileSize(fullFilePath, MAX_FILE_LENGTH)) {
          throw new MaxFileReadLengthExceededError(
            stats.size,
            MAX_FILE_LENGTH,
          );
        }
      }
    }

    // Handle image files
    if (isImageFile(ext)) {
      return {
        type: "tool-result" as const,
        returnDisplay: 'imgage file not supported',
        payload: {
          llmContent: 'imgage file not supported',
        }
      };
    }

    // Check if empty
    if (stats.size === 0) {
      return createEmptyFileResult(file_path);
    }

    // Read text file using fs
    const fileContent = fs.readFileSync(fullFilePath, { encoding: 'utf8' });
    if (fileContent === undefined || fileContent === null) {
      throw new Error(`Failed to read file: ${file_path}`);
    }

    // Process content
    const {
      content,
      totalLines,
      startLine,
      endLine,
      actualLimit,
      selectedLines,
    } = processFileContent(
      fileContent,
      offset ?? 1,
      limit ?? MAX_LINES_TO_READ,
    );

    // Validate and truncate (now synchronous with Level 2 & 3 validation)
    const { processedContent, actualLinesRead } =
      validateAndTruncateContent(content, selectedLines);

    return createReadResult(
      file_path,
      processedContent,
      totalLines,
      startLine,
      endLine,
      actualLimit,
      actualLinesRead,
      offset,
      limit,
    );
  } catch (e) {
    return {
      isError: true,
      returnDisplay: `Error: ${e instanceof Error ? e.message : String(e)}`,
      payload: {
        llmContent: e instanceof Error ? e.message : 'Unknown error',
      }
    };
  }
};

readExecutor.approval = {
  category: ApprovalCategory.READ,
}

export type ReadToolReturnDisplay = string;

export type ReadTool = {
  name: 'read',
  input: Input,
  output: Output,
}

