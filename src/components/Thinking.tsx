import React, { useEffect, useState, useMemo } from "react";
import { Text } from "ink";
import chalk from 'chalk';

// 使用单字节字符确保宽度一致
const GLITCH_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?~`';

const WORDS = ['THINKING', 'ANALYZING', 'PROCESSING', 'LOADING', 'COMPUTING'].map(w => '> ' + w + '...');

const getRandomColor = () => {
  const colors = [
    chalk.red, chalk.green, chalk.yellow, chalk.blue,
    chalk.magenta, chalk.cyan, chalk.white, chalk.gray,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const getRandomGlitchChar = () => {
  return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
};

export type ThinkingProps = {
  speed?: number;
  wordChangeInterval?: number;
  intensity?: number;
  words?: string[];
};

const Thinking: React.FC<ThinkingProps> = ({
  speed = 80,
  wordChangeInterval = 1000,
  intensity = 0.3,
  words = WORDS,
}) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');

  // 找到最长的单词长度
  const maxLength = useMemo(() => {
    return Math.max(...words.map(word => word.length));
  }, [words]);

  const currentWord = words[currentWordIndex]!;

  useEffect(() => {
    const wordInterval = setInterval(() => {
      setCurrentWordIndex(prev => (prev + 1) % words.length);
    }, wordChangeInterval);

    const animationInterval = setInterval(() => {
      // 生成固定长度的glitch文本
      let newText = '';
      
      for (let i = 0; i < maxLength; i++) {
        if (i < currentWord.length) {
          if (Math.random() < intensity) {
            newText += getRandomGlitchChar();
          } else {
            newText += currentWord[i];
          }
        } else {
          // 填充空格到固定长度
          newText += ' ';
        }
      }
      
      setDisplayText(newText);
    }, speed);

    return () => {
      clearInterval(wordInterval);
      clearInterval(animationInterval);
    };
  }, [speed, wordChangeInterval, intensity, currentWord, words.length, maxLength]);

  const renderColoredText = (text: string) => {
    return text.split('').map((char, index) => {
      const color = getRandomColor();
      return color?.(char) ?? char;
    }).join('');
  };

  return (
    <Text>
      {renderColoredText(displayText || currentWord.padEnd(maxLength, ' '))}
    </Text>
  );
};

export default React.memo(Thinking);