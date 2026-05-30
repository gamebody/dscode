import React from "react";
import { Box, Newline, Text } from "ink";
import { Colors } from "../utils/colors";
import { useStoreContext } from "../store/index";

const tips: string[] = [
  'Shift + Tab 切换 Agent/YOLO 模式',
  'Agent 模式: 执行前需人工确认',
  'YOLO  模式: 自动执行',
  '输入 @ 触发文件搜索，Enter 选择',
  '按 Tab 循环思考模式: off → high → max',
  '输入 / 查看所有可用内置指令',
  '按 Ctrl+C 两次可安全退出程序',
]

const PAT = /(\/[^\s]+|Ctrl\+\w|Shift|\/|↑|↓|Tab|Enter|Esc|Agent|YOLO|@|off|max|high)/g

function highlightTip(text: string, hlColor: string): React.ReactNode[] {
  const parts = text.split(PAT)
  return parts.map((part, i) =>
    new RegExp(PAT.source).test(part)
      ? <Text key={i} color={hlColor}>{part}</Text>
      : <React.Fragment key={i}>{part}</React.Fragment>
  )
}

const Tips: React.FC = () => {
  const agentMode = useStoreContext(s => s.bar.agentMode)
  const HL = agentMode === 'agent' ? Colors.AccentGreen : Colors.AccentYellow

  return (
    <Box flexDirection="column">
      <Box>
        <Text>
          <Newline />
          {tips.map((tip, i) => (
            <Text key={i}>
              {i + 1}. {highlightTip(tip, HL)}
              <Newline />
            </Text>
          ))}
        </Text>
      </Box>
    </Box>
  );
};

export default React.memo(Tips)
