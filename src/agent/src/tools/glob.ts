import { CodeAgentContext } from "../agents/codeAgent.js";
import { safeStringify } from "../utils/safeStringify.js";
import { glob } from "glob";
import { ApprovalCategory, TOOL_NAMES } from "../utils/constants.js";
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";

const LIMIT = 100;
const toolName = TOOL_NAMES.GLOB;

export const globToolSchema: ChatCompletionFunctionTool = {
  type: "function",
  function: {
    name: toolName,
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
};

type Input = {
  pattern: string;
  path?: string | null;
}

type Output = {
  llmContent: string;
}

export const globExecutor = async (input: Input, context: CodeAgentContext) => {
  const { pattern, path: searchPath } = input;
  try {
    const start = Date.now();
    const paths = await glob([pattern], {
      cwd: searchPath ?? context.cwd,
      nocase: true,
      nodir: true,
      stat: true,
      withFileTypes: true,
    });
    const sortedPaths = paths.sort(
      (a, b) => (a.mtimeMs ?? 0) - (b.mtimeMs ?? 0),
    );
    const truncated = sortedPaths.length > LIMIT;
    const filenames = sortedPaths
      .slice(0, LIMIT)
      .map((path) => path.fullpath());
    const message = truncated
      ? `Found ${filenames.length} files in ${Date.now() - start}ms, truncating to ${LIMIT}.`
      : `Found ${filenames.length} files in ${Date.now() - start}ms.`;

    return {
      type: "tool-result" as const,
      returnDisplay: message,
      payload: {
        llmContent: safeStringify({
          filenames,
          durationMs: Date.now() - start,
          numFiles: filenames.length,
          truncated,
        }),
      },
    };
  } catch (e) {
    return {
      isError: true,
      returnDisplay:  e instanceof Error ? e.message : 'Unknown error',
      payload: {
        llmContent: e instanceof Error ? e.message : 'Unknown error',
      },
    };
  }
};

globExecutor.approval = {
  category: ApprovalCategory.READ,
}

export type GlobToolReturnDisplay = string;

export type GlobTool = {
  name: 'glob',
  input: Input,
  output: Output,
}

