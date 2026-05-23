


import { ToolSet, TypedToolCall } from "ai";
import { CHAT_MODEL_ID, provider } from "../utils/model.js";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { ApprovalCategory } from "../utils/constants.js";
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { MessageLogger } from "../../../logger/index.js";
import type { ChatCompletionTool } from "openai/resources/chat/completions";


export type ModelConfig = {
  name: string
  apiKey: string
  baseURL: string
}

export type ModelMessage = ChatCompletionMessageParam

// Streaming event types yielded by Core.stream()
export type StreamEvent =
  | {
      type: 'text-delta'
      /** The incremental text content from this chunk */
      content: string
      /** The complete accumulated text so far */
      accumulated: string
    }
  | {
      type: 'reasoning-delta'
      /** The incremental reasoning/thinking content from this chunk */
      content: string
      /** The complete accumulated reasoning content so far */
      accumulated: string
    }
  | {
      type: 'tool-call-delta'
      /** The index of this tool call (0-based) */
      index: number
      /** The tool call id (set on first chunk for this tool call) */
      id?: string
      /** The function name (set on first chunk for this tool call) */
      name?: string
      /** The incremental JSON arguments fragment */
      arguments?: string
    }
  | {
      type: 'finish'
      /** The finish reason: 'stop', 'tool_calls', 'length', 'content_filter' */
      finishReason: string
      /** The complete accumulated text content, or null if none */
      content: string | null
      /** The complete accumulated reasoning content, if any */
      reasoningContent?: string
      /** Fully assembled tool calls if finishReason is 'tool_calls' */
      toolCalls?: Array<{
        id: string
        type: 'function'
        function: {
          name: string
          arguments: string
        }
      }>
      /** Token usage info if available from the stream */
      usage?: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
      }
    }

type Config<TContext = Record<string, any>> = {
  system?: string,
  messages?: ModelMessage[]
  model?: ModelConfig
  abortSignal?: AbortSignal
  /** 思考模式: off 关闭 | high 启用 | max 最大 */
  thinkingMode?: 'off' | 'high' | 'max'
  /** 日志存储目录 (如 ~/.one-coder/logs)，开启后记录每次对话消息 */
  logsDir?: string
  /** session 刷新时触发（例如重新注册依赖 sessionId 的工具） */
  onSessionRefresh?: () => void
  /** 上下文数据，会传给 tool executor */
  context?: TContext
}


export default class Core<TContext = Record<string, any>> {
  private modelName: string
  private messages: ModelMessage[]
  private tools: ToolSet
  private toolExecutors: any
  private system?: string
  private abortSignal?: AbortSignal
  private thinkingMode: 'off' | 'high' | 'max'
  private sessionId: string
  private logsDir?: string
  private client: OpenAI
  private onSessionRefresh?: () => void
  private context: TContext
  public logger: MessageLogger | null = null

  constructor(config?: Config<TContext> | undefined) {
    this.system = config?.system

    const modelName = config?.model?.name ?? CHAT_MODEL_ID

    this.modelName = modelName
    this.messages = config?.messages || []
    this.tools = {}

    this.toolExecutors = {}
    this.abortSignal = config?.abortSignal
    this.thinkingMode = config?.thinkingMode ?? 'max'
    this.onSessionRefresh = config?.onSessionRefresh
    this.context = config?.context ?? {} as TContext

    this.sessionId = this.createSessionId()

    this.logsDir = config?.logsDir

    if (config?.logsDir) {
      this.logger = new MessageLogger(config.logsDir, this.sessionId)
    }

    this.client = new OpenAI({
      apiKey: config?.model?.apiKey,
      baseURL: config?.model?.baseURL,
    });
  }


  private createSessionId() {
    return "xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0,
        v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  setSystem(system: string) {
    this.system = system
  }

  getSessionId() {
    return this.sessionId
  }

  setSessionId(sessionId: string) {
    this.sessionId = sessionId
    if (this.logsDir) {
      this.logger = new MessageLogger(this.logsDir, sessionId)
    }
  }

  refreshSessionId() {
    const newId = this.createSessionId()
    this.sessionId = newId
    this.onSessionRefresh?.()
    return newId
  }

  setAbortSignal(abortSignal: AbortSignal) {
    this.abortSignal = abortSignal
  }

  setThinkingMode(mode: 'off' | 'high' | 'max') {
    this.thinkingMode = mode
  }

  /** 根据 thinkingMode 构建 API 请求的思考强度参数 */
  private buildThinkingParam(): Record<string, any> | undefined {
    switch (this.thinkingMode) {
      case 'off':
        return { thinking: { type: 'disabled' } }
      case 'high':
        return { reasoning_effort: 'high' }
      case 'max':
        return { reasoning_effort: 'max' }
    }
  }

  registerTool(toolName: string, tool: any) {
    this.tools[toolName] = tool
  }

  registerToolExecutor(toolName: string, executor: any) {
    this.toolExecutors[toolName] = executor
  }

  private getTools(): ChatCompletionTool[] {
    return Object.values(this.tools) as any as ChatCompletionTool[]
  }

  appendMessage(message: ModelMessage | ModelMessage[], log = true) {
    if (Array.isArray(message)) {
      this.messages.push(...message)
      if (log && this.logger) {
        for (const msg of message) {
          this.logger.logMessage({ mm:msg })
        }
      }
      return
    }
    this.messages.push(message)
    if (log) {
      this.logger?.logMessage({ mm:message })
    }
  }

  clearMessages() {
    this.messages = []
  }

  executeTool(toolCall: TypedToolCall<ToolSet>, userInput?: unknown) {
    const executor = this.toolExecutors[toolCall.toolName]
    if (!executor) {
      const message = `Tool "${toolCall.toolName}" is not registered. Available tools: ${Object.keys(this.toolExecutors).join(', ') || 'none'}`
      return {
        type: "tool-result" as const, 
        returnDisplay: message,
        payload: {
          llmContent: message,
        },
      }
    }
    return executor(toolCall.input, this.context, userInput)
  }

  approvalCategory(toolCall: TypedToolCall<ToolSet>) {
    const executor = this.toolExecutors[toolCall.toolName]
    if (!executor) {
      return 'unknown'
    }
    if (executor.approval) {
      return executor.approval.category as ApprovalCategory
    }
    return 'unknown'
  }

  /**
   * Stream responses from the model using server-sent events.
   * Returns an async generator that yields StreamEvent objects as content arrives.
   *
   * Usage:
   *   for await (const event of core.stream()) {
   *     switch (event.type) {
   *       case 'text-delta':       /* render incremental text *​/
   *       case 'reasoning-delta':  /* render reasoning content *​/
   *       case 'tool-call-delta':  /* accumulate tool call args *​/
   *       case 'finish':           /* final result with assembled tool calls & usage *​/
   *     }
   *   }
   */
  async *stream(): AsyncGenerator<StreamEvent> {
    const systemMessage = this.system || ''

    const requestMessages = [
      { role: 'system' as const, content: systemMessage },
      ...this.messages,
    ]

    let stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>

    try {
      const thinkingParam = this.buildThinkingParam()
      stream = await this.client.chat.completions.create(
        {
          model: this.modelName,
          messages: requestMessages,
          tools: this.getTools(),
          stream: true,
          stream_options: { include_usage: true },
          ...(thinkingParam ?? {}),
        },
        {
          signal: this.abortSignal,
          body: {
            model: this.modelName,
            messages: requestMessages,
            tools: this.getTools(),
            stream: true,
            stream_options: { include_usage: true },
            ...(thinkingParam ?? {}),
          },
        },
      )
    } catch (error) {
      throw new Error(
        `Core.stream() API call failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      )
    }

    let accumulatedContent = ''
    let accumulatedReasoning = ''
    const toolCallAccumulator = new Map<
      number,
      { id?: string; name?: string; arguments: string }
    >()

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta
      const finishReason = chunk.choices?.[0]?.finish_reason

      // ---- text content delta ----
      if (delta?.content) {
        accumulatedContent += delta.content
        yield {
          type: 'text-delta' as const,
          content: delta.content,
          accumulated: accumulatedContent,
        }
      }

      // ---- reasoning / thinking content delta (DeepSeek-R1, etc.) ----
      const reasoningDelta = (delta as any)?.reasoning_content as string | undefined
      if (reasoningDelta) {
        accumulatedReasoning += reasoningDelta
        yield {
          type: 'reasoning-delta' as const,
          content: reasoningDelta,
          accumulated: accumulatedReasoning,
        }
      }

      // ---- tool call deltas ----
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index
          if (!toolCallAccumulator.has(idx)) {
            toolCallAccumulator.set(idx, { arguments: '' })
          }
          const acc = toolCallAccumulator.get(idx)!
          if (tc.id) acc.id = tc.id
          if (tc.function?.name) acc.name = tc.function.name
          if (tc.function?.arguments) acc.arguments += tc.function.arguments

          yield {
            type: 'tool-call-delta' as const,
            index: idx,
            id: tc.id,
            name: tc.function?.name,
            arguments: tc.function?.arguments,
          }
        }
      }

      // ---- finish ----
      if (finishReason) {
        if (finishReason === 'content_filter') {
          throw new Error(
            `Core.stream(): content filtered by API at finish`,
          )
        }

        // Assemble final tool calls from accumulator
        const finalToolCalls =
          toolCallAccumulator.size > 0
            ? Array.from(toolCallAccumulator.entries()).map(([, tc]) => ({
                id: tc.id!,
                type: 'function' as const,
                function: {
                  name: tc.name!,
                  arguments: tc.arguments,
                },
              }))
            : undefined

        yield {
          type: 'finish' as const,
          finishReason,
          content: accumulatedContent || null,
          reasoningContent: accumulatedReasoning || undefined,
          toolCalls: finalToolCalls,
          usage: (chunk as any).usage,
        }
      }
    }
  }
}


