import React, { useState, useRef, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../utils/colors';
import TextInput from '../InkTextInput';
import { QA } from '../../store/approval';

export type QuestionOption = {
  label: string;
  description: string;
};

export type Question = {
  question: string;
  header: string;
  options: QuestionOption[];
  multiSelect?: boolean;
  allowCustom?: boolean;
  customPlaceholder?: string;
};

export type AskUserQuestionInput = {
  questions: Question[];
};

interface QuestionAnswerProps {
  questions: Question[];
  onAnswer: (results: QA[] | null) => void;
}

const QuestionAnswer: React.FC<QuestionAnswerProps> = ({ questions, onAnswer }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<number[][]>(questions.map(() => []));
  const [customAnswers, setCustomAnswers] = useState<string[]>(questions.map(() => ''));
  const [showCustomInput, setShowCustomInput] = useState<boolean[]>(questions.map(() => false));
  const [validationError, setValidationError] = useState<string>('');
  const answerInputRef = useRef<any>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const currentSelected = selectedOptions[currentQuestionIndex] || [];
  const currentCustomAnswer = customAnswers[currentQuestionIndex] || '';
  const currentShowCustom = showCustomInput[currentQuestionIndex] || false;

  const handleOptionToggle = (optionIndex: number) => {
    setValidationError('');
    
    if (currentQuestion.multiSelect) {
      const newSelected = [...currentSelected];
      const existingIndex = newSelected.indexOf(optionIndex);
      if (existingIndex >= 0) {
        newSelected.splice(existingIndex, 1);
      } else {
        newSelected.push(optionIndex);
      }
      const newSelectedOptions = [...selectedOptions];
      newSelectedOptions[currentQuestionIndex] = newSelected;
      setSelectedOptions(newSelectedOptions);
      
      // 如果选择了选项，关闭自定义输入
      if (newSelected.length > 0) {
        const newShowCustom = [...showCustomInput];
        newShowCustom[currentQuestionIndex] = false;
        setShowCustomInput(newShowCustom);
      }
    } else {
      const newSelectedOptions = [...selectedOptions];
      newSelectedOptions[currentQuestionIndex] = [optionIndex];
      setSelectedOptions(newSelectedOptions);
      
      // 如果选择了选项，关闭自定义输入
      const newShowCustom = [...showCustomInput];
      newShowCustom[currentQuestionIndex] = false;
      setShowCustomInput(newShowCustom);
    }
  };

  const handleCustomAnswerChange = (value: string) => {
    setValidationError('');
    const newCustomAnswers = [...customAnswers];
    newCustomAnswers[currentQuestionIndex] = value;
    setCustomAnswers(newCustomAnswers);
  };

  const toggleCustomInput = () => {
    setValidationError('');
    const newShowCustom = [...showCustomInput];
    newShowCustom[currentQuestionIndex] = !currentShowCustom;
    setShowCustomInput(newShowCustom);
    
    // 如果开启自定义输入，清空选项选择
    if (!currentShowCustom) {
      const newSelectedOptions = [...selectedOptions];
      newSelectedOptions[currentQuestionIndex] = [];
      setSelectedOptions(newSelectedOptions);
    }
  };

  const validateCurrentQuestion = (): boolean => {
    if (currentShowCustom) {
      if (!currentCustomAnswer.trim()) {
        setValidationError('请输入自定义答案');
        return false;
      }
      return true;
    }
    
    if (currentSelected.length === 0) {
      setValidationError('请选择至少一个选项');
      return false;
    }
    
    return true;
  };

  const handleNextQuestion = () => {
    if (!validateCurrentQuestion()) {
      return;
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setValidationError('');
    } else {
      // 所有问题已回答，生成最终答案
      const answers = questions.map((q, idx) => {
        const selected = selectedOptions[idx];
        const custom = customAnswers[idx];
        const showCustom = showCustomInput[idx];
        
        if (showCustom && custom.trim()) {
          return custom;
        }
        
        if (selected.length === 0) {
          return '';
        }
        
        const selectedLabels = selected.map(i => q.options[i].label);
        return selectedLabels.join(', ');
      });
      
      onAnswer(answers.map((a, idx) => ({ q: questions[idx].question, a })));
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setValidationError('');
    }
  };

  const handleSkipQuestion = () => {
    const newSelectedOptions = [...selectedOptions];
    newSelectedOptions[currentQuestionIndex] = [];
    setSelectedOptions(newSelectedOptions);
    
    const newCustomAnswers = [...customAnswers];
    newCustomAnswers[currentQuestionIndex] = '';
    setCustomAnswers(newCustomAnswers);
    
    const newShowCustom = [...showCustomInput];
    newShowCustom[currentQuestionIndex] = false;
    setShowCustomInput(newShowCustom);
    
    setValidationError('');
    handleNextQuestion();
  };

  useInput((input, key) => {
    if (key.escape) {
      onAnswer(null);
      return;
    }
    
    if (key.return) {
      handleNextQuestion();
      return;
    }
    
    if (key.tab && currentQuestion.allowCustom) {
      toggleCustomInput();
      return;
    }
    
    if (key.leftArrow && currentQuestionIndex > 0) {
      handlePrevQuestion();
      return;
    }
    
    if (key.rightArrow && currentQuestionIndex < questions.length - 1) {
      handleNextQuestion();
      return;
    }
    
    if (key.upArrow && currentQuestionIndex > 0) {
      handlePrevQuestion();
      return;
    }
    
    if (key.downArrow && currentQuestionIndex < questions.length - 1) {
      handleNextQuestion();
      return;
    }
    
    if (input === 's' || input === 'S') {
      handleSkipQuestion();
      return;
    }
    
    // 数字键选择选项
    const num = parseInt(input);
    if (!isNaN(num) && num >= 1 && num <= currentQuestion.options.length) {
      handleOptionToggle(num - 1);
    }
    
    // 空格键切换多选
    if (input === ' ' && currentQuestion.multiSelect && currentSelected.length > 0) {
      const lastSelected = currentSelected[currentSelected.length - 1];
      handleOptionToggle(lastSelected);
    }
  });

  useEffect(() => {
    // 自动聚焦到输入框
    if (answerInputRef.current && currentShowCustom) {
      answerInputRef.current.setCursorOffset(currentCustomAnswer.length);
    }
  }, [currentQuestionIndex, currentShowCustom, currentCustomAnswer]);

  const getOptionIndicator = (index: number) => {
    if (currentSelected.includes(index)) {
      return currentQuestion.multiSelect ? '◉' : '●';
    }
    return currentQuestion.multiSelect ? '○' : '○';
  };

  const getOptionColor = (index: number) => {
    if (currentSelected.includes(index)) {
      return Colors.AccentGreen;
    }
    return Colors.Foreground;
  };

  const getProgressBar = () => {
    const width = 20;
    const progress = Math.round((currentQuestionIndex + 1) / questions.length * width);
    const filled = '█'.repeat(progress);
    const empty = '░'.repeat(width - progress);
    return `${filled}${empty}`;
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={Colors.AccentCyan} padding={1} marginTop={1}>
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text color={Colors.AccentCyan} bold>📋 问题回答</Text>
      </Box>
      
      <Box marginTop={1}>
        <Text color={Colors.AccentYellow} bold>
          {currentQuestion.header}
        </Text>
      </Box>
      
      <Box marginTop={1}>
        <Text color={Colors.Foreground} bold>
          {currentQuestion.question}
          <Text color={Colors.Gray}>
            {currentQuestion.multiSelect ? ' (多选)' : ' (单选)'}
          </Text>
        </Text>
      </Box>
      
      <Box flexDirection="column" marginTop={1}>
        {currentQuestion.options.map((option, index) => (
          <Box key={index} marginBottom={0}>
            <Text color={getOptionColor(index)}>
              {'  '}{getOptionIndicator(index)} {index + 1}. {option.label}
              <Text color={Colors.Gray}>
                {' '}— {option.description}
              </Text>
            </Text>
          </Box>
        ))}
        
        {currentQuestion.allowCustom && (
          <Box marginTop={1}>
            <Text color={currentShowCustom ? Colors.AccentGreen : Colors.Foreground}>
              {'  '}{currentShowCustom ? '◉' : '○'} C. 自定义答案
              {currentShowCustom && (
                <Text color={Colors.AccentGreen}> (已启用)</Text>
              )}
            </Text>
          </Box>
        )}
      </Box>
      
      {currentShowCustom && (
        <Box marginTop={1} flexDirection="column">
          <Text color={Colors.AccentGreen}>
            ✏️ 请输入自定义答案:
          </Text>
          <Box marginTop={0}>
            <TextInput
              ref={answerInputRef}
              value={currentCustomAnswer}
              onChange={handleCustomAnswerChange}
              placeholder={currentQuestion.customPlaceholder || "请输入您的答案..."}
              focus={currentShowCustom}
            />
          </Box>
        </Box>
      )}
      
      {validationError && (
        <Box marginTop={1}>
          <Text color={Colors.AccentRed}>
            {validationError}
          </Text>
        </Box>
      )}
      
      <Box marginTop={2} flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text color={Colors.Gray}>
            {currentQuestionIndex > 0 && (
              <Text>
                <Text color={Colors.AccentCyan}>←</Text> 上一题 (左箭头/上箭头)
              </Text>
            )}
          </Text>
          
          <Text color={Colors.Gray}>
            {currentQuestionIndex < questions.length - 1 ? (
              <Text>
                下一题 (右箭头/下箭头) <Text color={Colors.AccentCyan}>→</Text>
              </Text>
            ) : (
              <Text>
                完成 (Enter) <Text color={Colors.AccentGreen}>✓</Text>
              </Text>
            )}
          </Text>
        </Box>
        
        <Box marginTop={1}>
          <Text color={Colors.Gray}>
            <Text color={Colors.AccentYellow}>数字键</Text>选择
            {currentQuestion.multiSelect && <Text color={Colors.Gray}>(多选)</Text>}
            {currentQuestion.allowCustom && <Text color={Colors.Gray}> | <Text color={Colors.AccentYellow}>Tab</Text>自定义</Text>}
            <Text color={Colors.Gray}> | <Text color={Colors.AccentYellow}>S</Text>跳过</Text>
            <Text color={Colors.Gray}> | <Text color={Colors.AccentRed}>Esc</Text>取消</Text>
          </Text>
        </Box>
        
        <Box marginTop={1} flexDirection="row" justifyContent="space-between" alignItems="center">
          <Text color={Colors.Gray}>
            进度: [{getProgressBar()}] {currentQuestionIndex + 1}/{questions.length}
          </Text>
          <Text color={Colors.Gray}>
            状态: {
              currentShowCustom 
                ? `自定义: "${currentCustomAnswer || '未输入'}"`
                : currentSelected.length > 0
                  ? currentSelected.map(i => currentQuestion.options[i].label).join(', ')
                  : '未选择'
            }
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default QuestionAnswer;
