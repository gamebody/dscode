import { tool } from "ai";
import { z } from "zod";
import { readProjectFullContext } from "../../../utils/projectContext.js";
import { CodeAgentContext } from "../agents/codeAgent.js";
import { ApprovalCategory } from "../utils/constants.js";

const description =
  "Read the .AGENTS.md file for this project which contains key information (tech stack, commands, conventions, structure). Use this when you need detailed project context.";

const inputSchema = z.object({});

const outputSchema = z.object({
  llmContent: z.string().describe("The full content of .AGENTS.md"),
});

export const projectContextExecutor = async (
  _input: z.infer<typeof inputSchema>,
  context: CodeAgentContext,
) => {
  try {
    const content = readProjectFullContext(context.cwd);
    return {
      type: "tool-result" as const,
      returnDisplay: "Read project context from .AGENTS.md",
      payload: {
        llmContent: content,
      },
    };
  } catch (error) {
    return {
      isError: true,
      returnDisplay: `Error: ${error instanceof Error ? error.message : String(error)}`,
      payload: {
        llmContent: `Error: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
};

projectContextExecutor.approval = {
  category: ApprovalCategory.READ,
};

export const projectContextTool = tool({
  name: "project_context",
  description,
  inputSchema,
  outputSchema,
});

export type ProjectContextTool = {
  name: "project_context";
  input: z.infer<typeof inputSchema>;
  output: z.infer<typeof outputSchema>;
};
