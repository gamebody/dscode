import { useRef, useState } from "react"
import { Core } from "../../index.js"


type UIMessage = {
  role: 'user',
  content: string
} | {
  role: 'assistant',
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

      const { actor, result } = await agent.next()
      const totalTokens = result?.totalUsage?.totalTokens
      totalTokens && setTotalTokens(pre => pre + totalTokens)

      if (actor == 'user') {
        if (result.response.messages?.length) {
          agent.appendMessage(result.response.messages)
          setUIMessage(pre => [...pre, { role: 'assistant', content: result.text }])
        }
        if (result.text) {
          setLoading(false)
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
                  setUIMessage(pre => [...pre, { role: 'assistant', content: part.text }])
                }
              })
            }
          }
        });

        setUIMessage(pre => [...pre, ...result.toolCalls.map(item => {
          return {
            role: 'tool' as const,
            content: {
              toolCallId: item.toolCallId,
              toolName: item.toolName,
              input: item.input,
              state: 'loading',
              output: null
             }
          }
        })])
        
        const responses = await Promise.all((result.toolCalls).map(async (toolCall) => {

          const toolResponse = await agent.executeTool(toolCall);

          setUIMessage(pre => {
            const index = pre.findIndex(item => item.role == 'tool' && item.content.toolCallId == toolCall.toolCallId)

            pre[index].content = {
              ...pre[index].content,
              state: 'done',
              output: toolResponse.payload
            }

            return [...pre]
          })

          return {
            type: "tool-result" as const,
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            output: {
              type: "json" as const,
              value: JSON.stringify(toolResponse.payload),
            },
          }
        }));
        agent?.appendMessage({ role: 'tool', content: responses });
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







