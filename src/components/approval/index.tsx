import React, { FC, useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useStoreContext } from '../../store/index';
import { ApprovalDecision, QA } from '../../store/approval';
import { Colors } from '../../utils/colors';
import { ICON } from '../../utils/icons';
import { MarkdownDisplay } from '../../utils/MarkdownDisplay';
import QuestionAnswer from './QuestionAnswer';

const Approval: FC = () => {
  const { visible, pendingApproval, pendingAnswer, resolveCallback, answerResolveCallback, setVisible } = useStoreContext(state => state.approval);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  let options = [
    { label: 'Yes (once)', value: 'agree_once' as ApprovalDecision },
    { label: 'Yes, allow all edits during this session', value: 'agree_all_session' as ApprovalDecision },
    { label: 'No, and suggest changes (esc)', value: 'disagree' as ApprovalDecision },
  ];

  if (pendingApproval && pendingApproval.toolName == 'bash') {
    options = [
      { label: 'Yes (once)', value: 'agree_once' as ApprovalDecision },
      { label: 'Yes, allow all bash during this session', value: 'agree_all_session' as ApprovalDecision },
      { label: 'No, and suggest changes (esc)', value: 'disagree' as ApprovalDecision },
    ]
  }

  const handleDecision = (decision: ApprovalDecision) => {
    if (resolveCallback) {
      resolveCallback(decision);
      // 重置状态
      setVisible(false);
      setSelectedIndex(0);
    }
  };

  const handleAnswer = (userAnswer: QA[] | null) => {
    if (answerResolveCallback) {
      answerResolveCallback(userAnswer);
      // 重置状态
      setVisible(false);
    }
  };

  useInput((input, key) => {
    if (!visible) return;

    // 如果是回答问题模式，处理 Escape 键
    if (pendingAnswer) {
      if (key.escape) {
        handleAnswer(null);
      }
      return;
    }

    if (!resolveCallback) return;

    if (key.upArrow) {
      setSelectedIndex(prev => prev > 0 ? prev - 1 : options.length - 1);
    }

    if (key.downArrow) {
      setSelectedIndex(prev => prev < options.length - 1 ? prev + 1 : 0);
    }

    if (key.return) {
      const decision = options[selectedIndex]!.value;
      handleDecision(decision);
    }

    if (key.escape) {
      handleDecision('disagree');
    }
  });

  useEffect(() => {
    if (visible) {
      setSelectedIndex(0);
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  if (pendingAnswer) {
    return (
      <QuestionAnswer
        questions={pendingAnswer.input.questions}
        onAnswer={handleAnswer}
      />
    );
  }

  if (!pendingApproval) {
    return null;
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} marginTop={1}>
      <Text color="yellow" bold>需要确认操作</Text>
      <Text color={Colors.AccentGreen}>
        {ICON} {pendingApproval.toolName}
      </Text>

      {
        pendingApproval.toolName === 'write' ? (
          <MarkdownDisplay
            terminalWidth={80}
            isPending={false}
            text={pendingApproval.input.content} />
        ) : pendingApproval.toolName === 'edit' ? (
          <MarkdownDisplay
            terminalWidth={80}
            isPending={false}
            text={pendingApproval.input.new_string} />
        ) : pendingApproval.toolName === 'bash' ? (
          <MarkdownDisplay
            terminalWidth={80}
            isPending={false}
            text={pendingApproval.input.command} />
        ) : (
          <MarkdownDisplay
            terminalWidth={80}
            isPending={false}
            text={JSON.stringify(pendingApproval, null, 2)} />
        )
      }
      
      <Box flexDirection="column" marginTop={1}>
        {options.map((option, index) => (
          <Box key={option.value}>
            <Text color={selectedIndex === index ? 'green' : 'white'}>
              {selectedIndex === index ? '❯ ' : '  '}
              {index + 1}. {option.label}
            </Text>
          </Box>
        ))}
      </Box>

      <Text color="gray">
        ↑↓ 选择, Enter 确认, Esc 取消
      </Text>
    </Box>
  );
};

export default Approval;
