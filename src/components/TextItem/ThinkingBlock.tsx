import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { Colors } from "../../utils/colors";
import { ICON } from "../../utils/icons";
import Gradient from "ink-gradient";
import { MaxSizedBox } from "../MaxSizedBox";

const MAX_VISIBLE_LINES = 3;

const ThinkingBlock: React.FC<{
  content: string;
  isStreaming: boolean;
  terminalWidth: number;
  terminalHeight?: number;
}> = ({ content, isStreaming, terminalWidth }) => {
  const lines = useMemo(() => content.split("\n"), [content]);

  const maxHeight = MAX_VISIBLE_LINES + 1;
  const maxWidth = terminalWidth - 4;

  return (
    <Box
      flexDirection="column"
      paddingY={0}
      marginY={1}
      maxHeight={maxHeight + 3}
    >
      <Box>
        <Text color={Colors.AccentGreen}>{ICON} thinking</Text>
        <Gradient name="rainbow">
          <Text></Text>
        </Gradient>
      </Box>
      <Box marginLeft={2}>
        <MaxSizedBox
          maxWidth={maxWidth}
          maxHeight={maxHeight}
          overflowDirection="top"
        >
          {lines.map((line, i) => (
            <Box key={i}>
              <Text wrap="wrap" color={Colors.Foreground}>
                {line}
              </Text>
            </Box>
          ))}
        </MaxSizedBox>
      </Box>

    </Box>
  );
};

export default React.memo(ThinkingBlock);
