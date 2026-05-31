import React, { ReactElement } from "react";
import { Box, Text } from "ink";
import { UIMessage } from "../../store/agent";
import UserText from "./UserText";
import AssistantText from "./AssistantText";
import { Colors } from "../../utils/colors";
import ThinkingBlock from "./ThinkingBlock";
import { renderTool } from "./ToolRender";

export type TextItemProps = UIMessage & {
  isStreaming?: boolean;
  terminalWidth?: number;
  terminalHeight?: number;
};

const TextItem: React.FC<TextItemProps> = ({
  role,
  content,
  isStreaming,
  terminalWidth,
  terminalHeight,
}) => {
  const renderContent = (): ReactElement => {
    switch (role) {
      case "user":
        return <UserText text={content} />;
      case "assistant":
        return (
          <AssistantText
            content={content as string}
            isStreaming={isStreaming}
            terminalWidth={terminalWidth}
            terminalHeight={terminalHeight}
          />
        );
      case "thinking":
        return (
          <ThinkingBlock
            content={content as string}
            isStreaming={!!isStreaming}
            terminalWidth={terminalWidth ?? 80}
            terminalHeight={terminalHeight}
          />
        );
      case "tool":
        return renderTool(content);
      case "error":
        return (
          <Box borderStyle="round" borderColor={Colors.AccentRed} padding={1} marginY={1}>
            <Text color={Colors.AccentRed}>Error: {content}</Text>
          </Box>
        )
      default:
        return <Text>{JSON.stringify(content)}</Text>;
    }
  };

  return <Box flexDirection="column">{renderContent()}</Box>;
};

export default React.memo(TextItem);
