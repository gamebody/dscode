import React, { useEffect, useRef } from 'react';
import { useInput, Text, Box } from 'ink';
import { useStoreContext } from '../store/index';
import { Colors } from '../utils/colors';
import { getDateStr } from '../logger/index';
import path from 'node:path';

const ExitHandler: React.FC = () => {
  const exitConfirmState = useStoreContext(s => s.bar.exitConfirmState);
  const setExitConfirmState = useStoreContext(s => s.bar.setExitConfirmState);
  const setIsStatusBarVisible = useStoreContext(s => s.bar.setIsStatusBarVisible);
  const totalUsage = useStoreContext(s => s.bar.totalUsage);
  const sessionId = useStoreContext(s => s.bar.sessionId);
  const logsDir = useStoreContext(s => s.base.logs);
  const agentMode = useStoreContext(s => s.bar.agentMode);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const accentColor = agentMode === 'agent' ? Colors.AccentGreen : Colors.AccentYellow

  // 清理超时定时器
  const clearExitTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // 重置退出确认状态
  const resetExitConfirm = () => {
    setExitConfirmState('idle');
    setIsStatusBarVisible(true);
    clearExitTimeout();
  };

  // 处理退出逻辑
  const handleExit = () => {
    setExitConfirmState('exiting');
    
    // 延迟退出，让用户看到总结信息
    setTimeout(() => {
      process.exit(0);
    }, 500);
  };

  // 显示退出总结信息
  const tokenUsage = `${(totalUsage/1000).toFixed(1)}K tokens`;
  const summary = `会话 ${sessionId} 已结束`;
  const dateStr = getDateStr();
  const logFilePath = path.join(logsDir, dateStr, `${sessionId}.jsonl`);
  

  // 处理 Ctrl+C 按键
  useInput((input, key) => {
    if (key.ctrl && input.toLowerCase() === 'c') {
      if (exitConfirmState === 'idle') {
        // 第一次按 Ctrl+C
        setExitConfirmState('confirming');
        setIsStatusBarVisible(false);

        // 设置超时重置
        clearExitTimeout();
        timeoutRef.current = setTimeout(() => {
          resetExitConfirm();
        }, 1000); // 1秒后重置
      } else if (exitConfirmState === 'confirming') {
        // 第二次按 Ctrl+C
        clearExitTimeout();
        handleExit();
      }
    }
  });

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearExitTimeout();
    };
  }, []);

  // 当退出确认状态变化时，更新状态栏可见性
  useEffect(() => {
    if (exitConfirmState === 'confirming') {
      setIsStatusBarVisible(false);
    } else if (exitConfirmState === 'idle') {
      setIsStatusBarVisible(true);
    }
  }, [exitConfirmState, setIsStatusBarVisible]);

  // 显示退出确认提示
  if (exitConfirmState === 'confirming') {
    return (
      <Text color={accentColor}>
        再按一次 <Text color={Colors.AccentRed} bold>Ctrl+C</Text> 退出应用程序
      </Text>
    );
  }

  if (exitConfirmState == 'exiting') {
    return (
      <Box flexDirection='column'>
        <Text color={accentColor}>{summary}</Text>
        <Text color={accentColor}>使用 {tokenUsage}</Text>
        <Text color={accentColor}>日志 {logFilePath}</Text>
      </Box>
    );
  }

  return null;
};

export default ExitHandler;
