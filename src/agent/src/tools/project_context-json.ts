import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const projectContextTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "project_context",
    description:
      "Read the .AGENTS.md file for this project which contains key information (tech stack, commands, conventions, structure). Use this when you need detailed project context.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};
