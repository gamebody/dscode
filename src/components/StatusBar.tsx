





import React, { useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { useStoreContext } from "../store/index";
import { Colors } from "../utils/colors";
import Thinking from "./Thinking";

export type StatusBarProps = {
};


const Timer = () => {
  const [time, setTime] = React.useState(0)
  const isApprovalVisible = useStoreContext(s => s.approval.visible)

  useEffect(() => {
    const interval = setInterval(() => {
      if (isApprovalVisible) return
      setTime(prevTime => prevTime + 100)
    }, 100)
    
    return () => {
      clearInterval(interval)
    }
  }, [])

  const seconds = time / 1000

  const text = `${seconds.toFixed(1)}s`

  if (isApprovalVisible) return null
  
  return <Text color={Colors.Comment}>({text} Esc to cancel)</Text>
}

const StatusBar: React.FC<StatusBarProps> = () => {
  const usage = useStoreContext(s => s.bar.usage)
  const totalUsage = useStoreContext(s => s.bar.totalUsage)

  const statusText = useStoreContext(s => s.bar.statusText)
  const isPedning = useStoreContext(s => s.bar.isPending)
  const base = useStoreContext(s => s.base)

  const modelConfig = useStoreContext(s => s.userConfig.modelConfig)

  const isApprovalVisible = useStoreContext(s => s.approval.visible)
  const upgradeStateText = useStoreContext(s => s.bar.upgradeStateText)
  const sessionId = useStoreContext(s => s.bar.sessionId)
  const isStatusBarVisible = useStoreContext(s => s.bar.isStatusBarVisible)

  const agent = useStoreContext(s => s.agent)
  const thinkingMode = useStoreContext(s => s.bar.thinkingMode)
  const cycleThinkingMode = useStoreContext(s => s.bar.cycleThinkingMode)

  // Tab 键切换思考模式: off -> high -> max -> off
  useInput((_input, key) => {
    if (key.tab) {
      cycleThinkingMode()
    }
  })

  if (!isStatusBarVisible) {
    return null;
  }

  return (
      <Box flexDirection='column'>
        <Box flexDirection='row'>
          {
            isPedning && (
              <>
                {!isApprovalVisible && <Thinking />}
                <Text color={Colors.Foreground}>{statusText}</Text>
                <Timer />
              </>
            )
          }
        </Box>
        <Box flexDirection='row' flexWrap='wrap'>
          <Text color={thinkingMode === 'max' ? Colors.AccentGreen : thinkingMode === 'high' ? Colors.AccentYellow : Colors.Comment}>⇄ {thinkingMode} | </Text>
          <Text color={Colors.Comment}>{modelConfig.model || '输入/model配置模型'} | </Text>
          <Text color={Colors.Comment}>{base.cwd} | </Text>
          <Text color={Colors.Comment}>{(totalUsage/1000).toFixed(1)}K | </Text>
          <Text color={Colors.Comment}>{((usage/(modelConfig?.maxTokens || 30_000)) * 100).toFixed(2)}% | </Text>
          { upgradeStateText && <Text color={Colors.Comment}>{upgradeStateText} | </Text> }
          { sessionId && <Text color={Colors.Comment}>{sessionId}</Text> }
        </Box>
      </Box>
  );
};

export default React.memo(StatusBar)
