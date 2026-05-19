import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const skillTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "skill",
    description:
      "Load the full content of a skill document (.agents/skills/<name>/SKILL.md). Use this tool when you need detailed reference information about a specific technology, framework, or tool. The available skill names are listed in the system prompt.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The name of the skill to load (e.g., 'bun', 'react'). Must match one of the available skill names listed in the system prompt.",
        },
      },
      required: ["name"],
    },
  },
};
