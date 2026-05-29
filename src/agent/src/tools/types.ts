import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";
import type { CodeAgentContext } from "../agents/codeAgent.js";
import type { ApprovalCategory } from "../utils/constants.js";

export type ToolResult = {
  type?: "tool-result";
  isError?: boolean;
  returnDisplay?: unknown;
  payload: { llmContent: string | string[] };
};

export type ToolExecutor<TInput = Record<string, unknown>> = (
  input: TInput,
  context: CodeAgentContext,
  userInput?: unknown,
) => Promise<ToolResult>;

export interface ITool<TInput = Record<string, unknown>> {
  name: string;
  schema: ChatCompletionFunctionTool;
  executor: ToolExecutor<TInput>;
  approval: { category: ApprovalCategory };
}
