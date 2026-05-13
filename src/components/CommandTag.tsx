import React from "react";
import { Box, Text } from "ink";

export type CommandTagProps = {
  name: string
};

const CommandTag: React.FC<CommandTagProps> = ({ name }) => {
  return (
    <Box flexWrap='wrap' marginX={1}>
      <Box borderStyle="round" paddingX={1}>
        <Text>{name}</Text>
      </Box>
    </Box>
  );
};

export default React.memo(CommandTag)
