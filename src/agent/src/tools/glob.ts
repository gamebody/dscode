import { tool } from "ai";
import { z } from "zod";
import { CodeAgentContext } from "../agents/codeAgent.js";
import { safeStringify } from "../utils/safeStringify.js";
import { glob } from "glob";
import { ApprovalCategory } from "../utils/constants.js";

const LIMIT = 100;


const description = `Glob
- Fast file pattern matching tool that works with any codebase size
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name patterns`;

const inputSchema = z.object({
  pattern: z.string().describe('The glob pattern to match files against'),
  path: z
    .string()
    .optional()
    .nullable()
    .describe('The directory to search in'),
});

const outputSchema = z.object({
  llmContent: z.string().describe('The output of the tool'),
});

export const globExecutor = async (input: z.infer<typeof inputSchema>, context: CodeAgentContext) => {
  const { pattern, path } = input;
  try {
    const start = Date.now();
    const paths = await glob([pattern], {
      cwd: path ?? context.cwd,
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

export const globTool = tool({
  name: "glob",
  description,
  inputSchema,
  outputSchema,
});

export type GlobTool = {
  name: 'glob',
  input: z.infer<typeof inputSchema>,
  output: z.infer<typeof outputSchema>,
}
