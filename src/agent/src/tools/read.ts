import fs from "fs";
import path from "path";
import { CodeAgentContext } from "../agents/codeAgent.js";
import { MaxFileReadLengthExceededError, MaxFileReadTokenExceededError } from "../utils/error.js";
import { ApprovalCategory, TOOL_NAMES } from "../utils/constants.js";
import type { ITool } from "./types.js";
import { checkFileType, createEmptyFileResult, createReadResult, estimatePartialReadSize, isImageFile, processFileContent, processImage, resolveFilePath, validateAndTruncateContent, validateFileSize, validateReadParams } from "../utils/read.shared.js";

const MAX_LINES_TO_READ = 2000;
const MAX_LINE_LENGTH = 2000;
const MAX_FILE_LENGTH = 262144;

type Input = {
  file_path: string;
  offset?: number;
  limit?: number;
};

type Output = {
  llmContent: string;
};

export type ReadToolReturnDisplay = string;

export type ReadTool = {
  name: 'read',
  input: Input,
  output: Output,
};

export const readTool: ITool<Input> = {
  name: TOOL_NAMES.READ,

  schema: {
    type: "function",
    function: {
      name: TOOL_NAMES.READ,
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
  },

  approval: {
    category: ApprovalCategory.READ,
  },

  executor: async (input: Input, context: CodeAgentContext) => {
    const { file_path, offset, limit } = input;
    try {
      validateReadParams(offset, limit);

      const ext = path.extname(file_path).toLowerCase();
      checkFileType(ext, file_path);

      const fullFilePath = resolveFilePath(file_path, context.cwd);

      const stats = fs.statSync(fullFilePath);

      const isPartialRead = offset !== undefined || limit !== undefined;

      if (!isImageFile(ext)) {
        if (isPartialRead) {
          const estimatedSize = estimatePartialReadSize(
            fullFilePath,
            limit ?? MAX_LINES_TO_READ,
          );

          if (estimatedSize !== null && estimatedSize > MAX_FILE_LENGTH) {
            throw new MaxFileReadLengthExceededError(
              estimatedSize,
              MAX_FILE_LENGTH,
            );
          }
        } else {
          if (!validateFileSize(fullFilePath, MAX_FILE_LENGTH)) {
            throw new MaxFileReadLengthExceededError(
              stats.size,
              MAX_FILE_LENGTH,
            );
          }
        }
      }

      if (isImageFile(ext)) {
        return {
          type: "tool-result" as const,
          returnDisplay: 'imgage file not supported',
          payload: {
            llmContent: 'imgage file not supported',
          },
        };
      }

      if (stats.size === 0) {
        return createEmptyFileResult(file_path);
      }

      const fileContent = fs.readFileSync(fullFilePath, { encoding: 'utf8' });
      if (fileContent === undefined || fileContent === null) {
        throw new Error(`Failed to read file: ${file_path}`);
      }

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
        },
      };
    }
  },
};
