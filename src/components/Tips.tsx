





import React from "react";
import { Box, Text } from "ink";
import { Colors } from "../utils/colors";

export type TipsProps = {
};


const Tips: React.FC<TipsProps> = () => {
  return (
    <Box flexDirection="column">
      <Box>
        <Text>
          {'\n'}
          <Text color={Colors.AccentGreen}>请尝试以下操作：</Text>
          {'\n'}
          {'\n'} 1. 输入任务
          {'\n'} 2. 输入<Text color={Colors.AccentGreen} bold> / </Text>获取指令
          {'\n'} 3. 输入<Text color={Colors.AccentGreen} bold> @ </Text>引用
        </Text>
      </Box>
    </Box>
  );
};

export default React.memo(Tips)
