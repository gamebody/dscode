import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const globTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "glob",
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
