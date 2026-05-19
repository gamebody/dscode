import { tool } from "ai";
import { z } from "zod";
import { CodeAgentContext } from "../agents/codeAgent.js";
import { SkillsManager } from "../../../skills/index.js";
import { ApprovalCategory } from "../utils/constants.js";

const description =
  "Load the full content of a skill document. Skills provide reference information about specific technologies, frameworks, or tools. Use this when you need detailed guidance on a technology mentioned in the available skills list.";

const inputSchema = z.object({
  name: z.string().describe("The name of the skill to load (e.g., 'bun')"),
});

const outputSchema = z.object({
  llmContent: z.string().describe("The full content of the skill document"),
});

let skillsManager: SkillsManager | null = null;

function getSkillsManager(cwd: string): SkillsManager {
  if (!skillsManager || skillsManager.cwdPath !== cwd) {
    skillsManager = new SkillsManager(cwd);
  }
  return skillsManager;
}

export const skillExecutor = async (
  input: z.infer<typeof inputSchema>,
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

export const skillToolDef = tool({
  name: "skill",
  description,
  inputSchema,
  outputSchema,
});

export type SkillTool = {
  name: "skill";
  input: z.infer<typeof inputSchema>;
  output: z.infer<typeof outputSchema>;
};
