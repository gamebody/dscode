import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const lsTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "ls",
    description:
      "Use this tool to list files and directories in a given path.",
    parameters: {
      type: "object",
      properties: {
        dir_path: {
          type: "string",
          description: "The path to the directory to list.",
        },
      },
      required: ["dir_path"],
    },
  },
};
