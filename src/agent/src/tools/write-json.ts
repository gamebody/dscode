import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const writeTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "write",
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
