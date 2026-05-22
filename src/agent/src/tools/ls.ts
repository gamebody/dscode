import path from "path";
import { createFileTree, listDirectory, MAX_FILES, printTree, TRUNCATED_MESSAGE } from "../utils/list.js";
import { CodeAgentContext } from "../agents/codeAgent.js";
import { ApprovalCategory, TOOL_NAMES } from "../utils/constants.js";
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";

const toolName = TOOL_NAMES.LS;

export const lsToolSchema: ChatCompletionFunctionTool = {
  type: "function",
  function: {
    name: toolName,
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


type Input = {
  dir_path: string;
}

type Output = {
  llmContent: string;
}

export const lsExecutor = async (input: Input, context: CodeAgentContext) => {
  const { dir_path } = input;
  try {
      const fullFilePath = path.isAbsolute(dir_path)
        ? dir_path
        : path.resolve(context.cwd, dir_path);

      const result = listDirectory(
        fullFilePath,
        context.cwd,
        context.productName,
      ).sort();
      const tree = createFileTree(result);
      const userTree = printTree(context.cwd, tree);
      if (result.length < MAX_FILES) {
        return {
          type: "tool-result" as const,
          returnDisplay: `Listed ${result.length} files/directories`,
          payload: {
            llmContent: userTree,
          }
        };
      } else {
        const assistantData = `${TRUNCATED_MESSAGE}${userTree}`;
        return {
          type: "tool-result" as const,
          returnDisplay: `Listed ${result.length} files/directories (truncated)`,
          payload: {
            llmContent: assistantData,
          },
        };
      }
  } catch (error) {
    return {
      isError: true,
      returnDisplay:  `Error: ${error instanceof Error ? error.message : String(error)}`,
      payload: {
        llmContent: [`Error: ${error instanceof Error ? error.message : String(error)}`]
      },
    };
  }
};

lsExecutor.approval = {
  category: ApprovalCategory.READ,
}

export type LsTool = {
  name: 'ls',
  input: Input,
  output: Output,
}
