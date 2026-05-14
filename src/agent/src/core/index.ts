


import { generateText, LanguageModel, ModelMessage, stepCountIs, ToolSet, TypedToolCall } from "ai";
import { CHAT_MODEL_ID, provider } from "../utils/model.js";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { ApprovalCategory } from "../utils/constants.js";
import OpenAI from 'openai';



export type ModelConfig = {
  name: string
  apiKey: string
  baseURL: string
}

type Config = {
  system?: string,
  messages?: ModelMessage[]
  setContextCallback?: (context: any) => void
  model?: ModelConfig
  abortSignal?: AbortSignal
}


export default class Core {
  private model: LanguageModel
  private messages: ModelMessage[]
  private tools: ToolSet
  private toolExecutors: any
  private system?: string
  private context?: any
  private setContextCallback?: (context: any) => void
  private abortSignal?: AbortSignal
  private sessionId: string

  constructor(config?: Config | undefined) {
    this.system = config?.system

    const modelProvider = !!config?.model ? createOpenAICompatible({
      name: 'user-config-openai-compatible',
      apiKey: config?.model?.apiKey,
      baseURL: config?.model?.baseURL,
    })(config?.model?.name) : provider(CHAT_MODEL_ID)


    this.model = modelProvider
    this.messages = config?.messages || []
    this.tools = {}

    this.toolExecutors = {}
    this.context = {}
    this.setContextCallback = config?.setContextCallback
    this.abortSignal = config?.abortSignal

    this.sessionId = this.createSessionId()
  }


  private createSessionId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0,
        v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  setContext<T>(context: T) {
    this.context = {
      ...this.context,
      ...context,
    }

    if (this.setContextCallback) {
      this.setContextCallback(this.context)
    }
  }

  setSystem(system: string) {
    this.system = system
  }

  getSessionId() {
    return this.sessionId
  }

  refreshSessionId() {
    if (this.setContextCallback) {
      this.setContextCallback(this.context)
    }
    return this.sessionId = this.createSessionId()
  }

  setAbortSignal(abortSignal: AbortSignal) {
    this.abortSignal = abortSignal
  }

  registerTool(toolName: string, tool: any) {
    this.tools[toolName] = tool
  }

  registerToolExecutor(toolName: string, executor: any) {
    this.toolExecutors[toolName] = executor
  }

  appendMessage(message: ModelMessage | ModelMessage[]) {
    if (Array.isArray(message)) {
      this.messages.push(...message)
      return
    }
    this.messages.push(message)
  }

  clearMessages() {
    this.messages = []
  }

  executeTool(toolCall: TypedToolCall<ToolSet>, userInput?: unknown) {
    const executor = this.toolExecutors[toolCall.toolName]
    return executor(toolCall.input, this.context, userInput)
  }

  approvalCategory(toolCall: TypedToolCall<ToolSet>) {
    if (this.toolExecutors[toolCall.toolName].approval) {
      const approvalCategory = this.toolExecutors[toolCall.toolName].approval.category as ApprovalCategory
      
      return approvalCategory
    }
    return 'unknown'
  }

  async next() {

    const result = await generateText({
      model: this.model,
      system: this.system,
      messages: this.messages,
      tools: this.tools,
      abortSignal: this.abortSignal,
    });

    if (result.toolCalls.length) {
      return {
        actor: 'agent' as const,
        result
      }
    }

    return {
      actor: 'user' as const,
      result
    }
  }
}


