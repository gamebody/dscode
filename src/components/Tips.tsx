import React from "react";
import { Box, Text } from "ink";
import { Colors } from "../utils/colors";
import { useStoreContext } from "../store/index";

const tips: string[] = [
  'Shift+Tab 切换 Agent/YOLO 模式',
  'Agent 模式: 执行前需确认; YOLO 模式: 自动执行',
  '按 Ctrl+C 两次可安全退出程序',
  '输入 @ 触发文件搜索，Tab 或 Enter 选择',
  '按 Tab 循环思考模式: off → high → max',
  '按 ↑/↓ 在候选项列表中移动选择',
  '按 Enter 提交输入或确认选择',
  '按 Esc 取消当前 AI 操作',
  '输入 / 查看所有可用内置指令',
  '描述需求越详细，AI 生成结果越精准',
  '你可以分段描述复杂任务，逐步推进',
  'AI 可以直接创建、编辑和读取项目文件',
  '你可以随时要求 AI 解释它生成的代码',
]

let shuffled: string[] = []
let idx = 0

function shuffle(arr: string[]): string[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i] as string
    a[i] = a[j] as string
    a[j] = tmp
  }
  return a
}

function getNextTip(allTips: string[]): string {
  if (idx >= shuffled.length) {
    shuffled = shuffle(allTips)
    idx = 0
  }
  return shuffled[idx++]!
}

const PAT = /(\/[^\s]+|Ctrl\+\w|Shift\+\w|↑|↓|Tab|Enter|Esc|Agent|YOLO|@)/g

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
  const count = 3 + Math.round(Math.random())
  const items = Array.from({ length: count }, () => getNextTip(tips))

  return (
    <Box flexDirection="column">
      <Box>
        <Text>
          {'\n'}
          <Text color={Colors.AccentGreen}>请尝试以下操作：</Text>
          {'\n'}
          {'\n'}
          {items.map((tip, i) => (
            <Text key={i}>
              {' '}{i + 1}. {highlightTip(tip, HL)}
              {'\n'}
            </Text>
          ))}
        </Text>
      </Box>
    </Box>
  );
};

export default React.memo(Tips)
