import { tool } from "ai";
import { z } from "zod";
import path from "path";
import { createFileTree, listDirectory, MAX_FILES, printTree, TRUNCATED_MESSAGE } from "../utils/list.js";
import { CodeAgentContext } from "../agents/codeAgent.js";
import { ApprovalCategory } from "../utils/constants.js";

const description = `Use this tool to list files and directories in a given path.`;

const inputSchema = z.object({
  dir_path: z.string().describe("The path to the directory to list."),
});

const outputSchema = z.object({
  llmContent: z.string().describe("List of files and directories"),
});

export const lsExecutor = async (input: z.infer<typeof inputSchema>, context: CodeAgentContext) => {
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

export const lsTool = tool({
  name: "ls",
  description,
  inputSchema,
  outputSchema,
});

export type LsTool = {
  name: 'ls',
  input: z.infer<typeof inputSchema>,
  output: z.infer<typeof outputSchema>,
}
