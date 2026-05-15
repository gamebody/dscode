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

      // ---- streaming loop ----
      let accumulatedText = ''
      let accumulatedReasoning = ''
      let finalToolCalls: any[] | undefined
      let finishReason: string = ''
      let streamUsage: any

      for await (const event of agent.stream()) {
        switch (event.type) {
          case 'reasoning-delta': {
            accumulatedReasoning += event.content
            setUIMessage(pre => {
              const last = pre[pre.length - 1]
              if (last?.role === 'thinking') {
                // Update existing thinking message in place
                const updated = [...pre]
                updated[updated.length - 1] = { role: 'thinking', content: accumulatedReasoning }
                return updated
              }
              // First reasoning chunk — push new message
              return [...pre, { role: 'thinking', content: event.content }]
            })
            break
          }
          case 'text-delta': {
            accumulatedText += event.content
            setUIMessage(pre => {
              const last = pre[pre.length - 1]
              if (last?.role === 'assistant') {
                // Update existing assistant message in place
                const updated = [...pre]
                updated[updated.length - 1] = { role: 'assistant', content: accumulatedText }
                return updated
              }
              // First text chunk — push new message
              return [...pre, { role: 'assistant', content: event.content }]
            })
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
              setUIMessage(pre => [...pre, { role: 'assistant', content: event.content! }])
            }
            // If reasoning arrived entirely in finish
            if (!accumulatedReasoning && event.reasoningContent) {
              setUIMessage(pre => [...pre, { role: 'thinking', content: event.reasoningContent! }])
            }
            break
          }
        }
      }

      // ---- track token usage ----
      if (streamUsage?.total_tokens) {
        setTotalTokens(pre => pre + streamUsage.total_tokens)
      }

      // ---- process finish result ----
      if (finishReason === 'stop' || finishReason === 'length') {
        // Preserve reasoning_content for DeepSeek reasoning models
        agent.appendMessage({
          role: 'assistant',
          content: accumulatedText,
          ...(accumulatedReasoning
            ? { reasoning_content: accumulatedReasoning }
            : {}),
        } as any)
        setLoading(false)
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

        // Push loading tool states to UI
        setUIMessage(pre => [...pre, ...finalToolCalls!.map(tc => ({
          role: 'tool' as const,
          content: {
            toolCallId: tc.id,
            toolName: tc.function.name,
            input: (() => { try { return JSON.parse(tc.function.arguments) } catch { return {} } })(),
            state: 'loading' as const,
            output: null,
          }
        }))])

        const toolResultMessages = await Promise.all(finalToolCalls!.map(async (tc) => {
          const bridge = {
            toolCallId: tc.id,
            toolName: tc.function.name,
            input: (() => { try { return JSON.parse(tc.function.arguments) } catch { return {} } })(),
          } as any

          const toolResponse = await agent.executeTool(bridge)

          setUIMessage(pre => {
            const index = pre.findIndex(item => item.role === 'tool' && item.content.toolCallId === tc.id)
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
            tool_call_id: tc.id,
            content: JSON.stringify(toolResponse.payload),
          }
        }))

        agent.appendMessage(toolResultMessages as any)
        // Continue the loop — model may produce another response after tool results
        continue
      }

      // No recognised finish — bail out
      setLoading(false)
      break
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







