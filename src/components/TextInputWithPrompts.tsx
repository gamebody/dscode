
import React, { memo, useEffect, useId, useRef, useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "./InkTextInput";
import { SuggestionsSelect, type SuggestionsSelectItem } from "./SuggestionsSelect";
import { useStoreContext } from "../store/index";
import StatusBar from "./StatusBar";
import { Colors } from "../utils/colors";
import { codeAgent, ModelMessage } from "../agent";
import ModelSelect from "./ModelSelect";
import { commandRegistry } from "../commands/index";
import { fuzzySearchFiles, extractFileSearchTerm, replaceFileSearchTerm, FileSearchResult } from "../utils/fileSearch";
import resolveAtReferences from "../utils/resolveAtReferences";
import { useLatest } from "../hooks/useLatest";
import { SessionManager } from "../session/SessionManager";


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

  const base = useStoreContext(s => s.base)

  const isPedning = useStoreContext(s => s.bar.isPending)
  const isUserDecison = useStoreContext(s => s.bar.isUserDecison)
  const isResumeMode = useStoreContext(s => s.bar.isResumeMode)
  const resumeInputText = useStoreContext(s => s.bar.resumeInputText)
  const currentAgent = useStoreContext(s => s.agent.agent)


  const modelConfig = useStoreContext(s => s.userConfig.modelConfig)
        
  const latestRef = useLatest({ isResumeMode, visible, currentAgent })


  const setPending = useStoreContext(s => s.bar.setPending)
  const pushMessage = useStoreContext(s => s.messageHistory.pushMessage)
  const navigateUp = useStoreContext(s => s.messageHistory.navigateUp)
  const navigateDown = useStoreContext(s => s.messageHistory.navigateDown)
  const resetNavigation = useStoreContext(s => s.messageHistory.resetNavigation)
  const firstMessageRecorded = useRef(false)
  
  const thinkingMode = useStoreContext(s => s.bar.thinkingMode)
  const agentMode = useStoreContext(s => s.bar.agentMode)
  const setSessionId = useStoreContext(s => s.bar.setSessionId)
  const barReset = useStoreContext(s => s.bar.reset)
  const setExitConfirmState = useStoreContext(s => s.bar.setExitConfirmState)
  const setIsStatusBarVisible = useStoreContext(s => s.bar.setIsStatusBarVisible)
  const setResumeMode = useStoreContext(s => s.bar.setResumeMode)




  const sendMessage = useStoreContext(s => s.agent.sendMessage)
  const setAgent = useStoreContext(s => s.agent.setAgent)
  const setUIMessage = useStoreContext(s => s.agent.setUIMessage)
  const pushUIMessage = useStoreContext(s => s.agent.pushUIMessage)
  const setSessionApproved = useStoreContext(s => s.agent.setSessionApproved)
  const runLoop = useStoreContext(s => s.agent.runLoop)


  const refreshStaticKey = useStoreContext(s => s.history.refreshStaticKey)

  const logsDir = useStoreContext(s => s.base.logs)
  const sessionMgr = useMemo(() => new SessionManager(logsDir), [logsDir])

  const restoreSession = async (filePath: string, sessionId: string) => {
    const parsed = await sessionMgr.loadSession(filePath)
    const agent = codeAgent(
      { cwd: base.cwd, productName: base.productName, todosDir: base.todosDir },
      {
        model: modelConfig.apiKey && modelConfig.baseURL && modelConfig.model
          ? { name: modelConfig.model, apiKey: modelConfig.apiKey, baseURL: modelConfig.baseURL }
          : undefined,
        thinkingMode,
        logsDir: base.logs,
      },
    )
    agent.setSessionId(parsed.sessionId)
    setSessionId(parsed.sessionId)
    agent.appendMessage(parsed.messages, false)
    setAgent(agent)
    setUIMessage(parsed.uiMessages)
    setSessionApproved(false)
    refreshStaticKey()
    setResumeMode(false)
  }




  useEffect(() => {
    if (modelConfig.apiKey && modelConfig.baseURL && modelConfig.model) {
      const agent = codeAgent({
        cwd: base.cwd,
        productName: base.productName,
        todosDir: base.todosDir,
      }, {
        model: {
          name: modelConfig.model,
          apiKey: modelConfig.apiKey,
          baseURL: modelConfig.baseURL
        },
        thinkingMode: thinkingMode,
        logsDir: base.logs,
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
    const agent = codeAgent({
      cwd: base.cwd,
      productName: base.productName,
      todosDir: base.todosDir,
    }, {
      logsDir: base.logs,
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

  // 监听 ResumeFlow 设置的输入文本
  useEffect(() => {
    if (resumeInputText !== null) {
      setText(resumeInputText)
      inputRef.current?.setCursorOffset(resumeInputText.length)
    }
  }, [resumeInputText])

  // ESC 按键监听，用于取消当前操作
  useInput((input, key) => {
    const latest = latestRef.current

    if (key.escape) {
      if (latest.currentAgent) {
        latest.currentAgent.abort()
        setPending(false)
      }
    }
    
    // Tab 键处理：当有可见建议时，选择第一个建议
    if (key.tab && latest.visible && items.length > 0) {
      const firstItem = items[0]!;
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

    // 上下箭头浏览历史（仅在建议列表不可见且非恢复模式时使用）
    if (key.upArrow && !latest.visible && !latest.isResumeMode) {
      const historyText = navigateUp()
      if (historyText !== null) {
        setText(historyText)
        setVisible(false)
        inputRef.current?.setCursorOffset(historyText.length)
      }
    } else if (key.downArrow && !latest.visible && !latest.isResumeMode) {
      const historyText = navigateDown()
      if (historyText !== null) {
        setText(historyText)
        setVisible(false)
        inputRef.current?.setCursorOffset(historyText.length)
      }
    } else if (!key.return) {
      resetNavigation()
    }
  })



  const context = {
    setText,
    setVisible,
    setShowModelSelect,
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
        firstMessageRecorded.current = false
      }
    },
    setExitConfirmState,
    setIsStatusBarVisible,
    setResumeMode,
    sessionMgr,
    restoreSession,
  };

  return (
    <Box flexDirection='column'>
      {
        !(isPedning || isUserDecison || showModelSelect) && (
          <Box flexDirection="row" borderStyle="round" borderLeft={false} borderRight={false} borderColor={agentMode === 'agent' ? Colors.AccentGreen : Colors.AccentYellow}>
            <Text color={agentMode === 'agent' ? Colors.AccentGreen : Colors.AccentYellow}>{'❯'}</Text>
            <Box width={1} />
            <TextInput
              color={agentMode === 'agent' ? Colors.AccentGreen : Colors.AccentYellow}
              ref={inputRef}
              placeholder="Type your command here..."
              highlightPastedText
              showCursor={true}
              onSubmit={async submitText => {
                if (visible) return
                setVisible(false)

                if (!firstMessageRecorded.current) {
                  pushMessage(submitText)
                  firstMessageRecorded.current = true
                }
                resetNavigation()

                const isCommand = await commandRegistry.executeCommand(submitText, context);
                
                if (!isCommand) {
                  const resolvedText = resolveAtReferences(submitText, base.cwd)
                  await sendMessage(resolvedText)
                  setText('')
                  setPending(false)
                }
              }}
              value={text}
              onChange={async (value) => {
                setText(value)
                setVisible(false)
                setIsFileSearch(false)

                if (latestRef.current.isResumeMode && !value.startsWith('/resume ')) {
                  setResumeMode(false)
                }

                if (value === '/resume ' && !latestRef.current.isResumeMode) {
                  setResumeMode(true)
                  return
                }

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

                  if (newText === '/resume ') {
                    setResumeMode(true)
                    return
                  }
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
            }}
            onCancel={() => {
              setShowModelSelect(false)
            }}
          />
        )
      }
    </Box>
  );
};

export default memo(TextInputWithPrompts)
