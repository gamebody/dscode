import Core, { type ModelConfig } from "../core/index.js";
import { lsTool } from "../tools/ls.js";
import { readTool } from "../tools/read.js";
import { writeTool } from "../tools/write.js";
import { globTool } from "../tools/glob.js";
import { editTool } from "../tools/edit.js";
import { createTodoTool } from "../tools/todo.js";
import { bashTool } from "../tools/bash.js";
import path from "path";
import { generateSystemPrompt } from "../prompts/codeAgentSystem.js";
import { askUserQuestionTool } from "../tools/askUserQuestion.js";
import { readProjectSummary } from "../../../utils/projectContext.js";
import { skillTool } from "../tools/skill.js";
import { SkillsManager } from "../../../skills/index.js";
import dayjs from "dayjs";
import type { ChildProcess } from "child_process";


export interface BackgroundTask {
  process: ChildProcess;
  startTime: number;
  command: string;
  status: 'running' | 'completed' | 'killed' | 'error';
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface CodeAgentContext {
  cwd: string
  productName: string
  todosDir: string
  backgroundTasks?: Record<string, BackgroundTask>
}

export type CodeAgentOptions = {
  model?: ModelConfig
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
      language: 'Chinese',
      appendSystemPrompt: combinedAppend || undefined,
      workingDirectory: context.cwd,
      currentTime: dayjs().format("YYYY-MM-DD"),
    })

    agent.setSystem(systemPrompt)

    const filePath = path.join(context.todosDir, `${agent.getSessionId()}.json`)
    const { todoReadTool, todoWriteTool } = createTodoTool({ filePath: filePath })

    agent.register(todoReadTool)
    agent.register(todoWriteTool)
  }

  const agent = new Core<CodeAgentContext>({
    context: context,
    model: options?.model,
    logsDir: options?.logsDir,
    thinkingMode: options?.thinkingMode,
    onSessionRefresh() {
      initAgent(agent)
    },
  })

  initAgent(agent)

  agent.register(lsTool)
  agent.register(readTool)
  agent.register(writeTool)
  agent.register(globTool)
  agent.register(editTool)
  agent.register(bashTool)
  agent.register(askUserQuestionTool)
  agent.register(skillTool)

  return agent
}
