import React from 'react';
import { Text, Box } from 'ink';
import { Colors } from '../utils/colors';

export type UserTextProps = {
  text: string;
}

const UserText: React.FC<UserTextProps> = ({ text }) => {
  const prefix = '> ';
  const prefixWidth = prefix.length;

  return (
    <Box
      borderStyle="round"
      borderColor={Colors.Gray}
      flexDirection="row"
      paddingX={2}
      paddingY={0}
      marginY={1}
      alignSelf="flex-start"
    >
      <Box width={prefixWidth}>
        <Text color={Colors.Gray}>{prefix}</Text>
      </Box>
      <Box flexGrow={1}>
        <Text wrap="wrap" color={Colors.Gray}>
          {text}
        </Text>
      </Box>
    </Box>
  );
};

export default UserText
