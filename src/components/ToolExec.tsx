import React from 'react';
import { Text, Box } from 'ink';
import { Colors } from '../utils/colors';

export type ToolExecProps = {
  name: string;
  input: string
  output: string
}

const ToolExec: React.FC<ToolExecProps> = ({ name, input, output }) => {

  return (
    <Box
      borderColor={Colors.AccentPurple}
      flexDirection="column"
      paddingX={2}
      paddingY={0}
      marginY={1}
      alignSelf="flex-start"
    >
      <Box flexGrow={1}>
        <Text wrap="wrap" color={Colors.AccentGreen}>
          [{name}]
        </Text>
        <Text wrap="wrap" color={Colors.AccentCyan}>
          {input ? ' -> ' + input : ''}
        </Text>
      </Box>
      <Box paddingX={1}>
        <Text wrap="wrap" color={Colors.AccentCyan}>
          {output}
        </Text>
      </Box>
    </Box>
  );
};

export default ToolExec
