import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const readTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "read",
    description: `Reads a file from the local filesystem. You can access any file directly by using this tool.

Usage:
- By default, it reads up to 2000 lines starting from the beginning of the file
- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters
- Any lines longer than 2000 characters will be truncated
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
          description:
            "The line number to start reading from. Only provide if the file is too large to read at once",
          nullable: true,
        },
        limit: {
          type: "number",
          description:
            "The number of lines to read. Only provide if the file is too large to read at once",
          nullable: true,
        },
      },
      required: ["file_path"],
    },
  },
};
