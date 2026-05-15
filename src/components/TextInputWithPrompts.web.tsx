
import React, { memo, useEffect, useId, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "./InkTextInput";
import { SuggestionsSelect, SuggestionsSelectItem } from "./SuggestionsSelect";
import { useStoreContext } from "../store/index";
import StatusBar from "./StatusBar";
import { Colors } from "../utils/colors";
import { commandRegistry } from "../commands/index";

export type TextInputWithPromptsProps = {
};


const TextInputWithPrompts: React.FC<TextInputWithPromptsProps> = () => {
  const [text, setText] = useState('')
  const [visible, setVisible] = useState(false)
  const [showModelSelect, setShowModelSelect] = useState(false)

  const [items, setItems] = useState<SuggestionsSelectItem<string>[]>(() => {
    const commands = commandRegistry.getAllCommands();
    return commands.map(cmd => ({
      label: `${cmd.name.padEnd(10)}${cmd.description}`,
      value: cmd.name
    }));
  })

  const inputRef = useRef<any>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const base = useStoreContext(s => s.base)

  const isPedning = useStoreContext(s => s.bar.isPending)
  const isUserDecison = useStoreContext(s => s.bar.isUserDecison)


  const modelConfig = useStoreContext(s => s.userConfig.modelConfig)
        
  const currentAgent = useStoreContext(s => s.agent.agent)


  const setPending = useStoreContext(s => s.bar.setPending)
  
  const thinkingMode = useStoreContext(s => s.bar.thinkingMode)
  const setStatusText = useStoreContext(s => s.bar.setStatusText)
  const setSessionId = useStoreContext(s => s.bar.setSessionId)
  const barReset = useStoreContext(s => s.bar.reset)



  const sendMessage = useStoreContext(s => s.agent.sendMessage)
  const setAgent = useStoreContext(s => s.agent.setAgent)
  const setUIMessage = useStoreContext(s => s.agent.setUIMessage)
  const pushUIMessage = useStoreContext(s => s.agent.pushUIMessage)


  useEffect(() => {
    if (!visible) {
      const commands = commandRegistry.getAllCommands();
      setItems(commands.map(cmd => ({
        label: `${cmd.name.padEnd(10)}${cmd.description}`,
        value: cmd.name
      })));
    }
  }, [visible])

  // 组件卸载时清理 abortController
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // 思考模式变化时，同步到已有 agent（不重建 agent）
  useEffect(() => {
    if (currentAgent) {
      currentAgent.setThinkingMode(thinkingMode)
    }
  }, [thinkingMode, currentAgent])

  // ESC 按键监听，用于取消当前操作
  useInput((input, key) => {
    if (key.escape) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        setStatusText('操作已取消')
        setPending(false)
        
        // 创建新的 abortController 以备下次使用
        abortControllerRef.current = new AbortController()

        if (currentAgent) {
          currentAgent.setAbortSignal(abortControllerRef.current.signal)
        }
      }
    }
  })

  const context = {
    setText,
    setVisible,
    setShowModelSelect,
    setStatusText,
    setPending,
    pushUIMessage,
    base,
    clear: () => {
      if (currentAgent) {
        currentAgent.clearMessages()
        setUIMessage([])
        barReset()

        const sessionId = currentAgent.refreshSessionId()
        setSessionId(sessionId)
        
      }
    },
  };

  return (
    <Box flexDirection='column'>
      {
        !(isPedning || isUserDecison || showModelSelect) && (
          <Box flexDirection="row" borderStyle="round" borderLeft={false} borderRight={false} borderColor={Colors.AccentBlue}>
            <Text color={Colors.AccentGreen}>{'❯'}</Text>
            <Box width={1} />
            <TextInput
              color={Colors.AccentGreen}
              ref={inputRef}
              placeholder="Type your command here..."
              highlightPastedText
              showCursor={true}
              onSubmit={async submitText => {
                if (visible) return
                setVisible(false)

                // 特殊处理 /liuyun 命令
                if (submitText === '/liuyun') {
                  setText('')
                  return
                }

                const isCommand = await commandRegistry.executeCommand(submitText, context);
                
                if (!isCommand) {
                  await sendMessage(submitText)
                  setText('')
                  setStatusText('')
                  setPending(false)
                }
              }}
              value={text}
              onChange={async (value) => {
                setText(value)
                setVisible(false)

                if (value.startsWith('/')) {
                  const suggestions = commandRegistry.getSuggestions(value)
                  if (suggestions.length > 0) {
                    setItems(suggestions.map(suggestion => ({
                      label: suggestion.label,
                      value: suggestion.value
                    })))
                    setVisible(true)
                    return
                  }
                }
              }}></TextInput>
          </Box>
        )
      }
      {
        visible && (
          <Box borderStyle="round" borderColor={Colors.AccentBlue} borderLeft={false} borderRight={false} borderTop={false}>
            <SuggestionsSelect
              items={items}
              initialIndex={0}
              onSelect={async (value: string) => {
                                  // 命令模式：执行命令
                  await commandRegistry.executeCommand(value, context);
                  setVisible(false)
              }}
              isFocused={true}
              showScrollArrows={true}
              maxItemsToShow={7}
              filterable={false} />
          </Box>
        )
      }

      <StatusBar />
    </Box>
  );
};

export default memo(TextInputWithPrompts)
