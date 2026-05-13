





import React from "react";
import { Box, Text } from "ink";

export type SimpleTextProps = {
  text: string
};

export const name = 'SimpleText' as const

const SimpleText: React.FC<SimpleTextProps> = ({ text }) => {
  return (
    <Box flexDirection='column' paddingX={1}>
      <Box flexDirection='row' borderStyle={'single'} borderColor={'green}'}>
        <Text>{text}</Text>
      </Box>
    </Box>
  );
};

export default React.memo(SimpleText)
