import { useRef, useState } from "react"
import { Core } from "../../index.js"


type UIMessage = {
  role: 'user',
  content: string
} | {
  role: 'assistant',
  content: string
} | {
  role: 'thinking',
  content: string
} | {
  role: 'tool',
  content: any
}


export const useAgent = (agent?: Core) => {

  const ref = useRef<Core>(agent || new Core())


  const [UIMessage, setUIMessage] = useState<UIMessage[]>([])

  const [loading, setLoading] = useState(false)

  const [totalTokens, setTotalTokens] = useState(0)

  const sendMessage = async (message: string) => {
    if (loading) return
    setUIMessage(pre => [...pre, { role: 'user', content: message }])
    ref.current.appendMessage({ role: 'user', content: message })
    runLoop()
  }


  async function runLoop() {
    const agent = ref.current
    while (true) {
      setLoading(true)

      const output = await agent.next()
      if (!output) {
        setLoading(false)
        break
      }

      const { actor, result } = output

      // Push reasoning/thinking content to UI if present
      const reasoningContent = (result as any).reasoningContent as string | undefined
      if (reasoningContent) {
        setUIMessage(pre => [...pre, { role: 'thinking', content: reasoningContent }])
      }

      // Usage tracking (OpenAI format: result.response.usage)
      const usage = result.response?.usage
      if (usage?.total_tokens) {
        setTotalTokens(pre => pre + usage.total_tokens)
      }

      if (actor === 'user') {
        const text = result.text || ''
        // Append assistant message (OpenAI-compatible format)
        agent.appendMessage({ role: 'assistant' as any, content: text })
        if (text) {
          setUIMessage(pre => [...pre, { role: 'assistant', content: text }])
        }
        setLoading(false)
        break
      }

      if (actor === 'agent') {
        const choiceMsg = result.choice.message
        const toolCalls = result.toolCalls

        if (!toolCalls || toolCalls.length === 0) {
          setLoading(false)
          break
        }

        // Append assistant message with tool_calls (OpenAI format)
        agent.appendMessage({
          role: 'assistant',
          content: choiceMsg.content,
          tool_calls: choiceMsg.tool_calls,
        } as any)

        // Push text content to UI if present
        const assistantContent: string | null = choiceMsg.content
        if (assistantContent) {
          setUIMessage(pre => [...pre, { role: 'assistant', content: assistantContent }])
        }

        // Push loading tool states to UI
        setUIMessage(pre => [...pre, ...toolCalls.map(tc => {
          const t = tc as any
          return {
            role: 'tool' as const,
            content: {
              toolCallId: t.id,
              toolName: t.function.name,
              input: (() => { try { return JSON.parse(t.function.arguments) } catch { return {} } })(),
              state: 'loading' as const,
              output: null,
            }
          }
        })])

        const toolResultMessages = await Promise.all(toolCalls.map(async (tc) => {
          const t = tc as any
          const bridge = {
            toolCallId: t.id,
            toolName: t.function.name,
            input: (() => { try { return JSON.parse(t.function.arguments) } catch { return {} } })(),
          } as any

          const toolResponse = await agent.executeTool(bridge)

          setUIMessage(pre => {
            const index = pre.findIndex(item => item.role === 'tool' && item.content.toolCallId === t.id)
            if (index === -1) return pre

            const updated = [...pre] as any[]
            updated[index] = {
              ...updated[index],
              content: {
                ...updated[index].content,
                state: 'done' as const,
                output: toolResponse.payload,
              }
            }
            return updated as UIMessage[]
          })

          // Tool result in OpenAI format
          return {
            role: 'tool' as any,
            tool_call_id: t.id,
            content: JSON.stringify(toolResponse.payload),
          }
        }))

        agent.appendMessage(toolResultMessages as any)
      }
    }
  }


  return {
    agent: ref.current,
    sendMessage,
    UIMessage,
    loading,
    totalTokens,
  }
}







