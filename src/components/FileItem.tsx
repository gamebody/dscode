import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { Colors } from "../utils/colors";

export type FileItemProps = {
  analyzeState: "NotAnalyzed" | "Analyzing" | "Analyzed"
  path: string
  text?: string
};

export const name = 'FileItem' as const

const FileItem: React.FC<FileItemProps> = ({ analyzeState, path, text }) => {
  return (
    <Box flexDirection='column' paddingX={1}>
      <Box flexDirection='row'>
        {
          analyzeState == 'Analyzing' && <Spinner />
        }
        <Text color={analyzeState == 'Analyzing' ? Colors.LightBlue : Colors.Foreground}>✓ <Text>{path}</Text></Text>
      </Box>
      {
        text && (
          <Box marginLeft={2}>
            <Text color={Colors.Foreground}>{text}</Text>
          </Box>
        )
      }
    </Box>
  );
};

export default React.memo(FileItem)
