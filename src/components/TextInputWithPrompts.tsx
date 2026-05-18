
import React, { memo, useEffect, useId, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "./InkTextInput";
import { SuggestionsSelect, type SuggestionsSelectItem } from "./SuggestionsSelect";
import { useStoreContext } from "../store/index";
import StatusBar from "./StatusBar";
import { Colors } from "../utils/colors";
import { codeAgent, CodeAgentContext, ModelMessage } from "../agent";
import ModelSelect from "./ModelSelect";
import { commandRegistry } from "../commands/index";
import { fuzzySearchFiles, extractFileSearchTerm, replaceFileSearchTerm, FileSearchResult } from "../utils/fileSearch";

export type TextInputWithPromptsProps = {
};


const TextInputWithPrompts: React.FC<TextInputWithPromptsProps> = () => {
  const [text, setText] = useState('')
  const [visible, setVisible] = useState(false)
  const [showModelSelect, setShowModelSelect] = useState(false)
  const [isFileSearch, setIsFileSearch] = useState(false)
  const [fileSearchTerm, setFileSearchTerm] = useState('')

  const [items, setItems] = useState<SuggestionsSelectItem<string>[]>(() => {
    const commands = commandRegistry.getAllCommands();
    return commands.map(cmd => ({
      label: `${cmd.name.padEnd(10)}${cmd.description}`,
      value: cmd.name
    }));
  })

  const highlightValue = useRef<string | null>(null)

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
  const setSessionApproved = useStoreContext(s => s.agent.setSessionApproved)
  const runLoop = useStoreContext(s => s.agent.runLoop)


  const refreshStaticKey = useStoreContext(s => s.history.refreshStaticKey)




  useEffect(() => {
    if (modelConfig.apiKey && modelConfig.baseURL && modelConfig.model) {
      // 清理之前的 abortController
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // 创建新的 abortController
      abortControllerRef.current = new AbortController()
      
      const agent = codeAgent({
        name: modelConfig.model,
        apiKey: modelConfig.apiKey,
        baseURL: modelConfig.baseURL
      }, abortControllerRef.current.signal, thinkingMode, base.logs)

      agent.setContext<CodeAgentContext>({
        cwd: base.cwd,
        productName: base.productName,
        todosDir: base.todosDir,
      })
      setAgent(agent)
    }
  }, [modelConfig])

  // 思考模式变化时，同步到已有 agent（不重建 agent）
  useEffect(() => {
    if (currentAgent) {
      currentAgent.setThinkingMode(thinkingMode)
    }
  }, [thinkingMode, currentAgent])


  function useDefaultModel() {
    // 清理之前的 abortController
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // 创建新的 abortController
    abortControllerRef.current = new AbortController()
    
    const agent = codeAgent(undefined, abortControllerRef.current.signal, undefined, base.logs)
    agent.setContext<CodeAgentContext>({
      cwd: base.cwd,
      productName: base.productName,
      todosDir: base.todosDir,
    })
    setAgent(agent)
  }


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
    
    // Tab 键处理：当有可见建议时，选择第一个建议
    if (key.tab && visible && items.length > 0) {
      const firstItem = items[0];
      if (isFileSearch) {
        // 文件搜索模式：替换@搜索词为完整路径
        const newText = replaceFileSearchTerm(text, fileSearchTerm, firstItem.value)
        setText(newText)
        setVisible(false)
        setIsFileSearch(false)
        inputRef.current.setCursorOffset(newText.length)
      } else {
        // 命令模式：在命令后添加空格，允许输入参数
        let newText = firstItem.value + ' '
        if (highlightValue.current) {
          newText = highlightValue.current  + ' '
        }
        setText(newText)
        setVisible(false)
        inputRef.current.setCursorOffset(newText.length)

        // 选择完后重置
        highlightValue.current = null
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
    appendMessage: (message: ModelMessage) => {
      currentAgent?.appendMessage(message)
    },
    runLoop: () => runLoop(),
    base,
    clear: () => {
      if (currentAgent) {
        currentAgent.clearMessages()
        setUIMessage([])
        barReset()

        const sessionId = currentAgent.refreshSessionId()
        setSessionId(sessionId)

        setSessionApproved(false)
        refreshStaticKey()
        
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
                  useDefaultModel()
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
                setIsFileSearch(false)

                // 检查是否有@文件搜索
                let searchTerm = extractFileSearchTerm(value)

                if (searchTerm !== null || value[value.length - 1] == '@') {
                  setFileSearchTerm(searchTerm || '')
                  setIsFileSearch(true)
                  
                  // 搜索文件和目录（空字符串也会返回全部文件）
                  const searchResults = await fuzzySearchFiles(searchTerm || '', base.cwd)
                  if (searchResults.length > 0) {
                    setItems(searchResults.map(result => ({
                      label: `${result.relativePath}${result.isDirectory ? '/' : ''}`,
                      value: result.relativePath
                    })))
                    setVisible(true)
                    return
                  }
                }

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
                if (isFileSearch) {
                  // 文件搜索模式：替换@搜索词为完整路径
                  const newText = replaceFileSearchTerm(text, fileSearchTerm, value)
                  setText(newText)
                  setVisible(false)
                  setIsFileSearch(false)
                  inputRef.current.setCursorOffset(newText.length)
                } else {
                  // 命令模式：在命令后添加空格，允许输入参数
                  const newText = value + ' '
                  setText(newText)
                  setVisible(false)
                  inputRef.current.setCursorOffset(newText.length)
                }
              }}
              onHighlight={(value) => {
                highlightValue.current = value
              }}
              isFocused={true}
              showScrollArrows={true}
              maxItemsToShow={7}
              filterable={false} />
          </Box>
        )
      }
      {
        showModelSelect && (
          <ModelSelect
            onSubmit={() => {
              setShowModelSelect(false)
              setStatusText('模型配置已更新')
            }}
            onCancel={() => {
              setShowModelSelect(false)
            }}
          />
        )
      }
      <StatusBar />
    </Box>
  );
};

export default memo(TextInputWithPrompts)
