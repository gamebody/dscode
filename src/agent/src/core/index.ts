


import { ToolSet, TypedToolCall } from "ai";
import { CHAT_MODEL_ID, provider } from "../utils/model.js";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { ApprovalCategory } from "../utils/constants.js";
import OpenAI from 'openai';
import { openaiTools } from "../tools/openai-tools.js";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";


export type ModelConfig = {
  name: string
  apiKey: string
  baseURL: string
}

export type ModelMessage = ChatCompletionMessageParam

type Config = {
  system?: string,
  messages?: ModelMessage[]
  setContextCallback?: (context: any) => void
  model?: ModelConfig
  abortSignal?: AbortSignal
}


export default class Core {
  private modelName: string
  private messages: ModelMessage[]
  private tools: ToolSet
  private toolExecutors: any
  private system?: string
  private context?: any
  private setContextCallback?: (context: any) => void
  private abortSignal?: AbortSignal
  private sessionId: string
  private client: OpenAI

  constructor(config?: Config | undefined) {
    this.system = config?.system

    const modelName = config?.model?.name ?? CHAT_MODEL_ID

    this.modelName = modelName
    this.messages = config?.messages || []
    this.tools = {}

    this.toolExecutors = {}
    this.context = {}
    this.setContextCallback = config?.setContextCallback
    this.abortSignal = config?.abortSignal

    this.sessionId = this.createSessionId()

    this.client = new OpenAI({
      apiKey: config?.model?.apiKey,
      baseURL: config?.model?.baseURL,
    });
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
    const systemMessage = this.system || ''

    const requestMessages = [
      { role: 'system' as const, content: systemMessage },
      ...this.messages,
    ]

    let completion: OpenAI.Chat.Completions.ChatCompletion

    try {
      completion = await this.client.chat.completions.create(
        {
          model: this.modelName,
          messages: requestMessages,
          tools: openaiTools,
        },
        {

          body: {
            model: this.modelName,
            messages: requestMessages,
            tools: openaiTools,
          },
        },
      )
    } catch (error) {
      throw new Error(
        `Core.next() API call failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      )
    }

    const choice = completion.choices?.[0]
    if (!choice) {
      throw new Error('Core.next(): no choices returned from API')
    }

    const assistantMessage = choice.message

    // Extract reasoning/thinking content (supported by DeepSeek-R1 and other reasoning models)
    const reasoningContent = (assistantMessage as any).reasoning_content as string | undefined

    switch (choice.finish_reason) {
      case 'stop': {
        return {
          actor: 'user' as const,
          result: {
            text: assistantMessage.content,
            reasoningContent,
            response: completion,
            choice,
          },
        }
      }

      case 'tool_calls':
      case 'function_call': {
        return {
          actor: 'agent' as const,
          result: {
            toolCalls: assistantMessage.tool_calls,
            reasoningContent,
            response: completion,
            choice,
          },
        }
      }

      case 'length': {
        return {
          actor: 'user' as const,
          result: {
            text: assistantMessage.content,
            reasoningContent,
            response: completion,
            choice,
            truncated: true, // 标记为被截断
          },
        }
      }

      case 'content_filter': {
        throw new Error(
          `Core.next(): content filtered by API. Reason: ${JSON.stringify(assistantMessage)}`,
        )
      }

      default: {
        throw new Error(
          `Core.next(): unexpected finish_reason "${choice.finish_reason}"`,
        )
      }
    }
  }
}


