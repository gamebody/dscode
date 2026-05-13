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
          const { actor, result } = await agent.next()
          const totalTokens = result?.totalUsage?.totalTokens

          const lastStepUsage = result.usage.totalTokens

          if (lastStepUsage) {
            get().bar.setUsage(lastStepUsage)
          }
          if (totalTokens) {
            get().bar.setTotalUsage(totalTokens + get().bar.totalUsage)
          }

        if (actor == 'user') {
          if (result.response.messages?.length) {
            agent.appendMessage(result.response.messages)
            set((state: Store) => {
              return produce(state, (draft) => {
                draft.agent.UIMessage.push({ role: 'assistant', content: result.text })
              })
            })
          }
          if (result.text) {
            get().agent.setLoading(false)
          }
          break
        } else if (actor == 'agent') {
          if (result.toolCalls.length) {
            agent.appendMessage(result.response.messages)
          }

          result.response.messages?.forEach(message => {
            if (message.role === 'assistant') {
              if (Array.isArray(message.content)) {
                message.content.forEach(part => {
                  if (part.type === 'text') {
                    set((state: Store) => {
                      return produce(state, (draft) => {
                        draft.agent.UIMessage.push({ role: 'assistant', content: part.text })
                      })
                    })
                  }
                })
              }
            }
          })

          const responses = []
          let shouldStopLoop = false

          for (let i = 0; i < result.toolCalls.length; i++) {
            const toolCall = result.toolCalls[i];

            const approvalCategory = await agent.approvalCategory(toolCall)

            if (approvalCategory ==  ApprovalCategory.WRITE) {
              // 检查是否已经同意本次会话中的所有操作
              if (get().agent.sessionApproved) {
                // 如果已经同意本次会话中的所有操作，直接继续执行
                // 不需要用户再次确认
              } else {
                const userDecision = await get().approval.requestApproval(toolCall)

                if (userDecision === 'disagree') {
                  shouldStopLoop = true
                  break
                }
                
                // 处理其他决策类型
                if (userDecision === 'agree_all_session') {
                  // 设置会话级别的同意标志
                  set((state: Store) => {
                    return produce(state, (draft) => {
                      draft.agent.sessionApproved = true
                    })
                  })
                }
              }
            }

            if (approvalCategory === ApprovalCategory.COMMAND) {
              // command 类型都需要 确认
              const userDecision = await get().approval.requestApproval(toolCall)
              if (userDecision === 'disagree') {
                shouldStopLoop = true
                break
              }
            }


            let userAnswer: QA[] | null = null
            if (approvalCategory === ApprovalCategory.ASK) {
              // 获取用户回答
              userAnswer = await get().approval.requestAnswer(toolCall)
              if (userAnswer === null) {
                // 用户取消回答
                shouldStopLoop = true
                break
              }
            }

            const toolResponse = await agent.executeTool(toolCall, userAnswer || '')

            set((state: Store) => {
              return produce(state, (draft) => {
                draft.agent.UIMessage.push({
                  role: 'tool' as const,
                  content: {
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    name: toolCall.toolName as any,
                    input: toolCall.input,
                    state: 'done' as const,
                    returnDisplay: toolResponse.returnDisplay,
                    output: toolResponse.payload,
                  }
                })
              })
            })

            responses.push({
              type: "tool-result" as const,
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              output: {
                type: "json" as const,
                value: JSON.stringify(toolResponse.payload),
              },
            })
          }

          if (shouldStopLoop) {
            get().agent.setLoading(false)
            break
          }

          agent.appendMessage({ role: 'tool', content: responses })
        }
        } catch (error) {
          // 处理 abort 错误
          if (error instanceof Error && error.name === 'AbortError') {
            get().agent.setLoading(false)
            get().bar.setStatusText('操作已取消')
            break
          }
          // 重新抛出其他错误
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
