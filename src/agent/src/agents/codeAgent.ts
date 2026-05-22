import Core, { type ModelConfig } from "../core/index.js";
import { lsToolSchema, lsExecutor } from "../tools/ls.js";
import { readToolSchema, readExecutor } from "../tools/read.js";
import { writeToolSchema, writeExecutor } from "../tools/write.js";
import { globToolSchema, globExecutor } from "../tools/glob.js";
import { editToolSchema, editExecutor } from "../tools/edit.js";
import { createTodoTool, todoWriteToolSchema, todoReadToolSchema } from "../tools/todo.js";
import { bashToolSchema, bashExecutor } from "../tools/bash.js";
import path from "path";
import { generateSystemPrompt } from "../prompts/codeAgentSystem.js";
import { askUserQuestionToolSchema, askUserQuestionExecutor } from "../tools/askUserQuestion.js";
import { readProjectSummary } from "../../../utils/projectContext.js";
import { skillToolSchema, skillExecutor } from "../tools/skill.js";
import { SkillsManager } from "../../../skills/index.js";
import { TOOL_NAMES } from "../utils/constants.js";


export interface BackgroundTask {
  process: any;
  startTime: number;
  command: string;
}

export interface CodeAgentContext {
  cwd: string
  productName: string
  todosDir: string
  backgroundTasks?: Record<string, BackgroundTask>
}

export type CodeAgentOptions = {
  model?: ModelConfig
  abortSignal?: AbortSignal
  thinkingMode?: 'off' | 'high' | 'max'
  logsDir?: string
}

export default function codeAgent(context: CodeAgentContext, options?: CodeAgentOptions) {

  function initAgent(agent: Core) {
    const projectSummary = readProjectSummary(context.cwd)
    const skillsMgr = new SkillsManager(context.cwd)
    const skillSummary = skillsMgr.formatSummary()

    const combinedAppend = [
      projectSummary ? `## Project Context\n${projectSummary}` : undefined,
      skillSummary || undefined,
    ].filter(Boolean).join("\n\n")

    const systemPrompt = generateSystemPrompt({
      todo: true,
      productName: context.productName,
      language: 'English',
      appendSystemPrompt: combinedAppend || undefined,
    })

    agent.setSystem(systemPrompt)

    const filePath = path.join(context.todosDir, `${agent.getSessionId()}.json`)
    const {
      todoReadExecutor,
      todoWriteExecutor,
    } = createTodoTool({ filePath: filePath })

    agent.registerTool(TOOL_NAMES.TODO_READ, todoReadToolSchema)
    agent.registerToolExecutor(TOOL_NAMES.TODO_READ, todoReadExecutor)

    agent.registerTool(TOOL_NAMES.TODO_WRITE, todoWriteToolSchema)
    agent.registerToolExecutor(TOOL_NAMES.TODO_WRITE, todoWriteExecutor)
  }

  const agent = new Core<CodeAgentContext>({
    context: context,
    model: options?.model,
    logsDir: options?.logsDir,
    abortSignal: options?.abortSignal,
    thinkingMode: options?.thinkingMode,
    onSessionRefresh() {
      initAgent(agent)
    },
  })

  initAgent(agent)

  agent.registerTool(TOOL_NAMES.LS, lsToolSchema)
  agent.registerToolExecutor(TOOL_NAMES.LS, lsExecutor)

  agent.registerTool(TOOL_NAMES.READ, readToolSchema)
  agent.registerToolExecutor(TOOL_NAMES.READ, readExecutor)

  agent.registerTool(TOOL_NAMES.WRITE, writeToolSchema)
  agent.registerToolExecutor(TOOL_NAMES.WRITE, writeExecutor)

  agent.registerTool(TOOL_NAMES.GLOB, globToolSchema)
  agent.registerToolExecutor(TOOL_NAMES.GLOB, globExecutor)

  agent.registerTool(TOOL_NAMES.EDIT, editToolSchema)
  agent.registerToolExecutor(TOOL_NAMES.EDIT, editExecutor)

  agent.registerTool(TOOL_NAMES.BASH, bashToolSchema)
  agent.registerToolExecutor(TOOL_NAMES.BASH, bashExecutor)

  agent.registerTool(TOOL_NAMES.ASK_USER_QUESTION, askUserQuestionToolSchema)
  agent.registerToolExecutor(TOOL_NAMES.ASK_USER_QUESTION, askUserQuestionExecutor)

  agent.registerTool(TOOL_NAMES.SKILL, skillToolSchema)
  agent.registerToolExecutor(TOOL_NAMES.SKILL, skillExecutor)

  return agent
}
