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
          const output = await agent.next()
          if (!output) {
            get().agent.setLoading(false)
            break
          }

          const { actor, result } = output

          // Usage tracking (OpenAI format: result.response.usage)
          const usage = result.response?.usage
          if (usage?.total_tokens) {
            get().bar.setUsage(usage.total_tokens)
            get().bar.setTotalUsage(usage.total_tokens + get().bar.totalUsage)
          }

          if (actor === 'user') {
            const text = result.text || ''
            // Append assistant message (OpenAI-compatible format)
            agent.appendMessage({ role: 'assistant', content: text })
            if (text) {
              get().agent.pushUIMessage({ role: 'assistant', content: text })
            }
            get().agent.setLoading(false)
            break
          }

          if (actor === 'agent') {
            const choiceMsg = result.choice.message
            const toolCalls = result.toolCalls

            if (!toolCalls || toolCalls.length === 0) {
              get().agent.setLoading(false)
              break
            }

            // Append assistant message with tool_calls (OpenAI format)
            agent.appendMessage({
              role: 'assistant',
              content: choiceMsg.content,
              tool_calls: choiceMsg.tool_calls,
            })

            // Push text content to UI if present
            if (choiceMsg.content) {
              get().agent.pushUIMessage({ role: 'assistant', content: choiceMsg.content })
            }

            let shouldStopLoop = false
            const toolResultMessages: any[] = []

            for (const rawTc of toolCalls) {
              const tc = rawTc
              // Bridge: OpenAI tool_call → format that Core methods and approval expect
              if (tc.type != 'function') {
                break
              }
              const bridge = {
                toolCallId: tc.id,
                toolName: tc.function.name,
                input: (() => { try { return JSON.parse(tc.function.arguments) } catch { return {} } })(),
              } as any

              const approvalCategory = agent.approvalCategory(bridge)

              if (approvalCategory === ApprovalCategory.WRITE) {
                if (!get().agent.sessionApproved) {
                  const userDecision = await get().approval.requestApproval(bridge)
                  if (userDecision === 'disagree') {
                    shouldStopLoop = true
                    break
                  }
                  if (userDecision === 'agree_all_session') {
                    get().agent.setSessionApproved(true)
                  }
                }
              }

              if (approvalCategory === ApprovalCategory.COMMAND) {
                const userDecision = await get().approval.requestApproval(bridge)
                if (userDecision === 'disagree') {
                  shouldStopLoop = true
                  break
                }
              }

              let userAnswer: QA[] | null = null
              if (approvalCategory === ApprovalCategory.ASK) {
                userAnswer = await get().approval.requestAnswer(bridge)
                if (userAnswer === null) {
                  shouldStopLoop = true
                  break
                }
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

              // Collect tool result message (OpenAI format)
              toolResultMessages.push({
                role: 'tool' as any,
                tool_call_id: tc.id,
                content: JSON.stringify(toolResponse.payload),
              })
            }

            if (shouldStopLoop) {
              get().agent.setLoading(false)
              break
            }

            // Append all tool result messages at once
            if (toolResultMessages.length > 0) {
              agent.appendMessage(toolResultMessages as any)
            }
          }
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
