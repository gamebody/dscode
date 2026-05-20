


import { ToolSet, TypedToolCall } from "ai";
import { CHAT_MODEL_ID, provider } from "../utils/model.js";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { ApprovalCategory } from "../utils/constants.js";
import OpenAI from 'openai';
import { openaiTools } from "../tools/openai-tools.js";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { MessageLogger } from "../../../logger/index.js";


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

type Config = {
  system?: string,
  messages?: ModelMessage[]
  setContextCallback?: (context: any) => void
  model?: ModelConfig
  abortSignal?: AbortSignal
  /** 思考模式: off 关闭 | high 启用 | max 最大 */
  thinkingMode?: 'off' | 'high' | 'max'
  /** 日志存储目录 (如 ~/.one-coder/logs)，开启后记录每次对话消息 */
  logsDir?: string
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
  private thinkingMode: 'off' | 'high' | 'max'
  private sessionId: string
  private client: OpenAI
  public logger: MessageLogger | null = null

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
    this.thinkingMode = config?.thinkingMode ?? 'max'

    this.sessionId = this.createSessionId()

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

  appendMessage(message: ModelMessage | ModelMessage[]) {
    if (Array.isArray(message)) {
      this.messages.push(...message)
      if (this.logger) {
        for (const msg of message) {
          this.logger.logMessage(msg)
        }
      }
      return
    }
    this.messages.push(message)
    this.logger?.logMessage(message)
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

  async next() {
    const systemMessage = this.system || ''

    const requestMessages = [
      { role: 'system' as const, content: systemMessage },
      ...this.messages,
    ]

    let completion: OpenAI.Chat.Completions.ChatCompletion

    try {
      const thinkingParam = this.buildThinkingParam()
      completion = await this.client.chat.completions.create(
        {
          model: this.modelName,
          messages: requestMessages,
          tools: openaiTools,
          ...(thinkingParam ?? {}),
        },
        {
          body: {
            model: this.modelName,
            messages: requestMessages,
            tools: openaiTools,
            ...(thinkingParam ?? {}),
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
          tools: openaiTools,
          stream: true,
          stream_options: { include_usage: true },
          ...(thinkingParam ?? {}),
        },
        {
          signal: this.abortSignal,
          body: {
            model: this.modelName,
            messages: requestMessages,
            tools: openaiTools,
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


