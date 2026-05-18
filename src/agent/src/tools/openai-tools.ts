import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { readTool } from "./read-json";
import { writeTool } from "./write-json";
import { editTool } from "./edit-json";
import { bashTool } from "./bash-json";
import { globTool } from "./glob-json";
import { lsTool } from "./ls-json";
import { todoWriteTool } from "./todoWrite-json";
import { todoReadTool } from "./todoRead-json";
import { askUserQuestionTool } from "./askUserQuestion-json";

export const openaiTools: ChatCompletionTool[] = [
  readTool,
  writeTool,
  editTool,
  bashTool,
  globTool,
  lsTool,
  todoWriteTool,
  todoReadTool,
  askUserQuestionTool,
];
