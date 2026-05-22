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

    agent.registerTool('todoRead', todoReadToolSchema)
    agent.registerToolExecutor('todoRead', todoReadExecutor)

    agent.registerTool('todoWrite', todoWriteToolSchema)
    agent.registerToolExecutor('todoWrite', todoWriteExecutor)
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

  agent.registerTool('ls', lsToolSchema)
  agent.registerToolExecutor('ls', lsExecutor)

  agent.registerTool('read', readToolSchema)
  agent.registerToolExecutor('read', readExecutor)

  agent.registerTool('write', writeToolSchema)
  agent.registerToolExecutor('write', writeExecutor)


  agent.registerTool('glob', globToolSchema)
  agent.registerToolExecutor('glob', globExecutor)

  agent.registerTool('edit', editToolSchema)
  agent.registerToolExecutor('edit', editExecutor)

  agent.registerTool('bash', bashToolSchema)
  agent.registerToolExecutor('bash', bashExecutor)

  agent.registerTool('askUserQuestion', askUserQuestionToolSchema)
  agent.registerToolExecutor('askUserQuestion', askUserQuestionExecutor)

  agent.registerTool('skill', skillToolSchema)
  agent.registerToolExecutor('skill', skillExecutor)

  return agent
}
