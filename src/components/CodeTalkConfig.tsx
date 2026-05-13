import React, { FC, useEffect, useRef, useState } from 'react';
import { Box, Newline, Text } from "ink";
import SelectInput from 'ink-select-input'
import { Colors } from '../utils/colors';

type ProjectId = number
type BranchName = string

export type Props = {
  onSubmit: (payload: [ProjectId, BranchName]) => void
}

const CodeTalkConfig: FC<Props> = ({ onSubmit }) => {
  const projects = ([
    {
      label: '融易阳光_后端,融易阳光-登录-20250710',
      value: 1149,
    },
    {
      label: '融易阳光_前端,ly_rong_yi_gai_ban',
      value: 1148,
    }
  ])


  return (
    <Box marginLeft={1} paddingX={1} flexDirection='column'>
      <Text color={Colors.AccentGreen}>你要跟哪个项目进行深度聊天？</Text>
      <Text>----</Text>
      <SelectInput
        items={projects.map((item, index) => {
          return ({
            label: `${index+1}. ${item.label}`,
            value: item.value
          })
        })}
        onSelect={item => {
          onSubmit([item.value, item.label.split(',')[1]])
        }} />
    </Box>
  );
}

export default CodeTalkConfig
