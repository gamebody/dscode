import { StateCreator } from 'zustand'
import { produce } from 'immer'
import { StateActions } from './index'
import { ApprovalCategory, AskUserQuestionTool, BashTool, Core, EditTool, GlobTool, LsTool, ModelMessage, ReadTool, TodoReadTool, TodoWriteTool, WriteTool } from '../agent'
import { log } from 'console'
import { QA } from './approval'


export type Tools = ReadTool | LsTool | GlobTool | WriteTool | EditTool | TodoWriteTool | TodoReadTool | BashTool | AskUserQuestionTool

export type Tool = {
  role: 'tool',
  content: {
    toolCallId: string
    toolName: string
    state: 'loading' | 'done'
    returnDisplay?: unknown
  } & Tools
}

export type UIMessage = {
  role: 'user',
  content: string
} | {
  role: 'assistant',
  content: string
} | {
  role: 'thinking',
  content: string
} | Tool

type State = {
  agent: Core | null
  UIMessage: UIMessage[]
  loading: boolean
  sessionApproved: boolean
}

type Action = {
  setAgent: (agent: Core) => void
  sendMessage: (message: string) => Promise<void>
  setLoading: (loading: boolean) => void
  pushUIMessage: (message: UIMessage) => void
  setUIMessage: (messages: UIMessage[]) => void
  setSessionApproved: (approved: boolean) => void
  runLoop: () => Promise<void>
  reset: () => void
}

export type Store = {
  agent: State & Action
}

const initialValues: State = {
  agent: null,
  UIMessage: [],
  loading: false,
  sessionApproved: false,
}

export const stateCreator: StateCreator<
  StateActions,
  [],
  [],
  Store
> = (set, get) => ({
  agent: {
    ...initialValues,
    setAgent(agent) {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.agent.agent = agent
        })
      })
      get().bar.setSessionId(agent.getSessionId())
    },
    pushUIMessage(message) {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.agent.UIMessage.push(message)
        })
      })
    },
    setUIMessage(messages){
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.agent.UIMessage = messages
        })
      })
    },
    setSessionApproved(approved: boolean) {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.agent.sessionApproved = approved
        })
      })
    },
    setLoading(loading) {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.agent.loading = loading
        })
      })
      get().bar.setPending(loading)
    },
    async sendMessage(message: string) {
      const { agent, loading } = get().agent
      if (loading || !agent) return

      set((state: Store) => {
        return produce(state, (draft) => {
          draft.agent.UIMessage.push({ role: 'user', content: message })
        })
      })
      agent.appendMessage({ role: 'user', content: message })
      await get().agent.runLoop()
    },
    async runLoop() {
      const { agent } = get().agent
      if (!agent) return

      while (true) {
        get().agent.setLoading(true)

        try {
          // ---- streaming loop ----
          let accumulatedText = ''
          let accumulatedReasoning = ''
          let finalToolCalls: any[] | undefined
          let finishReason: string = ''
          let streamUsage: any

          // Track message indices for progressive UI updates
          let thinkingMsgIndex = -1
          let assistantMsgIndex = -1

          for await (const event of agent.stream()) {
            switch (event.type) {
              case 'reasoning-delta': {
                accumulatedReasoning += event.content
                if (thinkingMsgIndex === -1) {
                  thinkingMsgIndex = get().agent.UIMessage.length
                  get().agent.pushUIMessage({ role: 'thinking', content: event.content })
                } else {
                  const msgs = [...get().agent.UIMessage]
                  msgs[thinkingMsgIndex] = { role: 'thinking', content: accumulatedReasoning }
                  get().agent.setUIMessage(msgs)
                }
                break
              }
              case 'text-delta': {
                accumulatedText += event.content
                if (assistantMsgIndex === -1) {
                  assistantMsgIndex = get().agent.UIMessage.length
                  get().agent.pushUIMessage({ role: 'assistant', content: event.content })
                } else {
                  const msgs = [...get().agent.UIMessage]
                  msgs[assistantMsgIndex] = { role: 'assistant', content: accumulatedText }
                  get().agent.setUIMessage(msgs)
                }
                break
              }
              case 'tool-call-delta':
                // Tool calls are accumulated internally by stream(), used at finish
                break
              case 'finish': {
                finishReason = event.finishReason
                finalToolCalls = event.toolCalls
                streamUsage = event.usage

                // If content arrived entirely in finish (no text-delta events), push now
                if (!accumulatedText && event.content) {
                  accumulatedText = event.content
                  get().agent.pushUIMessage({ role: 'assistant', content: event.content })
                }
                // If reasoning arrived entirely in finish
                if (!accumulatedReasoning && event.reasoningContent) {
                  get().agent.pushUIMessage({ role: 'thinking', content: event.reasoningContent })
                }
                break
              }
            }
          }

          // ---- track token usage ----
          if (streamUsage?.total_tokens) {
            get().bar.setUsage(streamUsage.total_tokens)
            get().bar.setTotalUsage(streamUsage.total_tokens + get().bar.totalUsage)
          }

          // ---- process finish result ----
          if (finishReason === 'stop' || finishReason === 'length') {
            // Append assistant message to conversation history.
            // DeepSeek reasoning models require reasoning_content to be
            // preserved in subsequent turns — otherwise 400.
            agent.appendMessage({
              role: 'assistant',
              content: accumulatedText,
              ...(accumulatedReasoning
                ? { reasoning_content: accumulatedReasoning }
                : {}),
            } as any)
            get().agent.setLoading(false)
            break
          }

          if (finishReason === 'tool_calls' && finalToolCalls && finalToolCalls.length > 0) {
            // Append assistant message with tool_calls (OpenAI format)
            agent.appendMessage({
              role: 'assistant',
              content: accumulatedText || null,
              ...(accumulatedReasoning
                ? { reasoning_content: accumulatedReasoning }
                : {}),
              tool_calls: finalToolCalls,
            } as any)

            let shouldStopLoop = false
            const toolResultMessages: any[] = []

            for (const tc of finalToolCalls) {
              if (tc.type !== 'function') continue

              const bridge = {
                toolCallId: tc.id,
                toolName: tc.function.name,
                input: (() => { try { return JSON.parse(tc.function.arguments) } catch { return {} } })(),
              } as any

              if (shouldStopLoop) {
                toolResultMessages.push({
                  role: 'tool' as any,
                  tool_call_id: tc.id,
                  content: JSON.stringify({ error: 'Cancelled: user disagreed with a previous action' }),
                })
                continue
              }

              const approvalCategory = agent.approvalCategory(bridge)
              const agentMode = get().bar.agentMode

              if (approvalCategory === ApprovalCategory.WRITE) {
                if (agentMode === 'yolo') {
                  // YOLO 模式：自动同意
                } else if (!get().agent.sessionApproved) {
                  const userDecision = await get().approval.requestApproval(bridge)
                  if (userDecision === 'disagree') {
                    shouldStopLoop = true
                  } else if (userDecision === 'agree_all_session') {
                    get().agent.setSessionApproved(true)
                  }
                }
              }

              if (approvalCategory === ApprovalCategory.COMMAND) {
                if (agentMode === 'yolo') {
                  // YOLO 模式：自动同意
                } else if (!get().agent.sessionApproved) {
                  const userDecision = await get().approval.requestApproval(bridge)
                  if (userDecision === 'disagree') {
                    shouldStopLoop = true
                  } else if (userDecision === 'agree_all_session') {
                    get().agent.setSessionApproved(true)
                  }
                }
              }

              let userAnswer: QA[] | null = null
              if (approvalCategory === ApprovalCategory.ASK) {
                userAnswer = await get().approval.requestAnswer(bridge)
                if (userAnswer === null) {
                  shouldStopLoop = true
                }
              }

              if (shouldStopLoop) {
                toolResultMessages.push({
                  role: 'tool' as any,
                  tool_call_id: tc.id,
                  content: JSON.stringify({ error: 'Action rejected by user' }),
                })
                continue
              }

              const toolResponse = await agent.executeTool(bridge, userAnswer || '')

              get().agent.pushUIMessage({
                role: 'tool' as const,
                content: {
                  toolCallId: tc.id,
                  toolName: tc.function.name,
                  name: tc.function.name as any,
                  input: bridge.input,
                  state: 'done' as const,
                  returnDisplay: toolResponse.returnDisplay,
                  output: toolResponse.payload,
                }
              })

              toolResultMessages.push({
                role: 'tool' as any,
                tool_call_id: tc.id,
                content: JSON.stringify(toolResponse.payload),
              })
            }

            if (toolResultMessages.length > 0) {
              agent.appendMessage(toolResultMessages as any)
            }

            if (shouldStopLoop) {
              get().agent.setLoading(false)
              break
            }

            continue
          }

          // No recognised finish — bail out
          get().agent.setLoading(false)
          break
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            get().agent.setLoading(false)
            get().bar.setStatusText('操作已取消')
            break
          }
          throw error
        }
      }
    },
    reset() {
      set((state: Store) => {
        return produce(state, (draft) => {
          draft.agent = {
            ...draft.agent,
            ...initialValues
          }
        })
      })
    }
  }
})
