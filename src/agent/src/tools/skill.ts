import { CodeAgentContext } from "../agents/codeAgent.js";
import { SkillsManager } from "../../../skills/index.js";
import { ApprovalCategory, TOOL_NAMES } from "../utils/constants.js";
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";

const toolName = TOOL_NAMES.SKILL;

export const skillToolSchema: ChatCompletionFunctionTool = {
  type: "function",
  function: {
    name: toolName,
    description: "Load the full content of a skill document (.agents/skills/<name>/SKILL.md). Use this tool when you need detailed reference information about a specific technology, framework, or tool. The available skill names are listed in the system prompt.",
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

type Input = {
  name: string;
}

type Output = {
  llmContent: string;
}

let skillsManager: SkillsManager | null = null;

function getSkillsManager(cwd: string): SkillsManager {
  if (!skillsManager || skillsManager.cwdPath !== cwd) {
    skillsManager = new SkillsManager(cwd);
  }
  return skillsManager;
}

export const skillExecutor = async (
  input: Input,
  context: CodeAgentContext,
) => {
  const { name } = input;

  try {
    const manager = getSkillsManager(context.cwd);
    const result = manager.loadContent(name);

    if (result === null) {
      const available = manager.list()
        .map((s) => s.name)
        .join(", ");
      return {
        isError: true,
        returnDisplay: `Skill "${name}" not found. Available skills: ${available || "none"}`,
        payload: {
          llmContent: `Error: Skill "${name}" not found. Available skills: ${available || "none"}`,
        },
      };
    }

    return {
      type: "tool-result" as const,
      returnDisplay: `Loaded skill "${name}"${result.cached ? " (cached)" : ""}`,
      payload: { llmContent: result.content },
    };
  } catch (error) {
    return {
      isError: true,
      returnDisplay: `Error loading skill "${name}": ${error instanceof Error ? error.message : String(error)}`,
      payload: {
        llmContent: `Error: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
};

skillExecutor.approval = {
  category: ApprovalCategory.READ,
};

export type SkillToolReturnDisplay = string;

export type SkillTool = {
  name: "skill";
  input: Input;
  output: Output;
};
