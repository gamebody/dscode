


import React from "react";
import { Box, Text, useInput } from "ink";
import { useStoreContext } from "../store/index";
import { Colors } from "../utils/colors";

export type StatusBarProps = {
};

const StatusBar: React.FC<StatusBarProps> = () => {
  const usage = useStoreContext(s => s.bar.usage)
  const totalUsage = useStoreContext(s => s.bar.totalUsage)

  const base = useStoreContext(s => s.base)

  const modelConfig = useStoreContext(s => s.userConfig.modelConfig)

  const upgradeStateText = useStoreContext(s => s.bar.upgradeStateText)
  const sessionId = useStoreContext(s => s.bar.sessionId)
  const isStatusBarVisible = useStoreContext(s => s.bar.isStatusBarVisible)

  const thinkingMode = useStoreContext(s => s.bar.thinkingMode)
  const cycleThinkingMode = useStoreContext(s => s.bar.cycleThinkingMode)
  const agentMode = useStoreContext(s => s.bar.agentMode)
  const cycleAgentMode = useStoreContext(s => s.bar.cycleAgentMode)

  // Tab 键切换思考模式: off -> high -> max -> off
  // Shift+Tab 切换 Agent 模式: agent <-> yolo
  useInput((_input, key) => {
    if (key.tab && !key.shift) {
      cycleThinkingMode()
    }
    if (key.tab && key.shift) {
      cycleAgentMode()
    }
  })

  if (!isStatusBarVisible) {
    return null;
  }

  return (
    <Box flexDirection='row' flexWrap='wrap'>
      <Text color={agentMode === 'agent' ? Colors.AccentGreen : Colors.AccentYellow}>⇄ {agentMode === 'agent' ? 'Agent' : 'YOLO'} </Text>
      <Text color={thinkingMode === 'max' ? Colors.AccentGreen : thinkingMode === 'high' ? Colors.AccentYellow : Colors.Comment}>{thinkingMode} | </Text>
      <Text color={Colors.Comment}>{modelConfig.model || '输入/model配置模型'} | </Text>
      <Text color={Colors.Comment}>{base.cwd} | </Text>
      <Text color={Colors.Comment}>{(totalUsage/1000).toFixed(1)}K | </Text>
      <Text color={Colors.Comment}>{((usage/(modelConfig?.maxTokens || 30_000)) * 100).toFixed(2)}% | </Text>
      { upgradeStateText && <Text color={Colors.Comment}>{upgradeStateText} | </Text> }
      { sessionId && <Text color={Colors.Comment}>{sessionId}</Text> }
    </Box>
  );
};

export default React.memo(StatusBar)
