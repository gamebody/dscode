import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { Colors } from "../../utils/colors";
import { ICON } from "../../utils/icons";
import { MarkdownDisplay } from "../../utils/MarkdownDisplay";
import Gradient from "ink-gradient";
import { MaxSizedBox } from "../MaxSizedBox";

export type AssistantTextProps = {
  content: string;
  isStreaming?: boolean;
  terminalWidth?: number;
  terminalHeight?: number;
};

const AssistantText: React.FC<AssistantTextProps> = ({
  content,
  isStreaming,
  terminalWidth,
  terminalHeight,
}) => {
  const lines = useMemo(() => content.split("\n"), [content]);
  const maxHeight = 10 + 1;
  const maxWidth = (terminalWidth ?? 80) - 4;

  return (
    <Box marginY={1} flexDirection="column">
      <Box flexDirection="row">
        <Gradient name="rainbow">
          <Text>{ICON} ONECODE</Text>
        </Gradient>
      </Box>
      {isStreaming ? (
        <Box flexDirection="column" marginLeft={2} maxHeight={maxHeight}>
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
      ) : (
        <Box flexDirection="column" marginLeft={2}>
          <MarkdownDisplay
            availableTerminalHeight={terminalHeight}
            text={content}
            isPending={false}
            terminalWidth={terminalWidth ?? 80}
          />
        </Box>
      )}
    </Box>
  );
};

export default AssistantText;
