import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const todoReadTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "todoRead",
    description: `Use this tool to read the current todo list. You can use this tool to:
1. Check the current state of the todo list
2. Verify which tasks are completed, in progress, or pending`,
    parameters: {
      type: "object",
      properties: {},
    },
  },
};
