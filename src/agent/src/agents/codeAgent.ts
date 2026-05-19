import Core, { type ModelConfig } from "../core/index.js";
import { lsExecutor, lsTool } from "../tools/ls.js";
import { readExecutor, readTool } from "../tools/read.js";
import { writeExecutor, writeTool } from "../tools/write.js";
import { globExecutor, globTool, GlobTool } from "../tools/glob.js";
import { editExecutor, editTool } from "../tools/edit.js";
import { createTodoTool } from "../tools/todo.js";
import { bashExecutor, bashTool } from "../tools/bash.js";
import path from "path";
import { generateSystemPrompt } from "../prompts/codeAgentSystem.js";
import { askUserQuestionExecutor, askUserQuestionTool } from "../tools/askUserQuestion.js";
import { readProjectSummary } from "../../../utils/projectContext.js";
import { projectContextExecutor, projectContextTool } from "../tools/project_context.js";
import { skillExecutor, skillToolDef } from "../tools/skill.js";
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

export default function codeAgent(model?: ModelConfig, abortSignal?: AbortSignal, thinkingMode?: 'off' | 'high' | 'max', logsDir?: string) {
    
  const agent = new Core({
    model: model,
    logsDir: logsDir,
    abortSignal: abortSignal,
    thinkingMode: thinkingMode,
    setContextCallback(context: CodeAgentContext) {

      const projectSummary = readProjectSummary(context.cwd)
      const skillsMgr = new SkillsManager(context.cwd)
      const skillSummary = skillsMgr.formatSummary()

      const combinedAppend = [
        projectSummary ? `## Project Context\n${projectSummary}` : undefined,
        skillSummary || undefined,
      ].filter(Boolean).join("\n\n")

      agent.setSystem(generateSystemPrompt({
        todo: true,
        productName: context.productName,
        language: 'English',
        appendSystemPrompt: combinedAppend || undefined,
      }))

      const filePath = path.join(context.todosDir, `${agent.getSessionId()}.json`)
      const {
        todoReadTool,
        todoReadExecutor,
        todoWriteTool,
        todoWriteExecutor,
      } = createTodoTool({ filePath: filePath })

      agent.registerTool('todoRead', todoReadTool)
      agent.registerToolExecutor('todoRead', todoReadExecutor)

      agent.registerTool('todoWrite', todoWriteTool)
      agent.registerToolExecutor('todoWrite', todoWriteExecutor)
    },
  })

  agent.registerTool('ls', lsTool)
  agent.registerToolExecutor('ls', lsExecutor)

  agent.registerTool('read', readTool)
  agent.registerToolExecutor('read', readExecutor)

  agent.registerTool('write', writeTool)
  agent.registerToolExecutor('write', writeExecutor)


  agent.registerTool('glob', globTool)
  agent.registerToolExecutor('glob', globExecutor)

  agent.registerTool('edit', editTool)
  agent.registerToolExecutor('edit', editExecutor)

  agent.registerTool('bash', bashTool)
  agent.registerToolExecutor('bash', bashExecutor)

  agent.registerTool('askUserQuestion', askUserQuestionTool)
  agent.registerToolExecutor('askUserQuestion', askUserQuestionExecutor)

  agent.registerTool('project_context', projectContextTool)
  agent.registerToolExecutor('project_context', projectContextExecutor)

  agent.registerTool('skill', skillToolDef)
  agent.registerToolExecutor('skill', skillExecutor)

  return agent
}








