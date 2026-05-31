import React, { ReactElement, ReactNode } from "react";
import { Box, Text } from "ink";
import { ReturnDisplay, Tool } from "../../store/agent";
import { Colors } from "../../utils/colors";
import { DiffViewer } from "../DiffViewer";
import { TOOL_NAMES } from "../../agent/src/utils/constants";

const STATUS_ICONS: Record<string, string> = {
  completed: "✓",
  in_progress: "⟳",
  pending: "☐",
};

const STATUS_COLORS: Record<string, string> = {
  completed: Colors.AccentGreen,
  in_progress: Colors.AccentYellow,
  pending: Colors.Gray,
};

const PRIORITY_COLORS: Record<string, string> = {
  high: Colors.AccentRed,
  medium: Colors.AccentYellow,
  low: Colors.AccentGreen,
};

type TodoItem = {
  id: string;
  status: string;
  content: string;
  priority: string;
};

const TodoList: React.FC<{ todos: TodoItem[] }> = ({ todos }) => (
  <Box marginLeft={3} flexDirection="column">
    <Text color={Colors.Gray}>↳ Todos ({todos.length}):</Text>
    {todos.map((todo, index) => {
      const statusIcon = STATUS_ICONS[todo.status] ?? STATUS_ICONS.pending;
      const statusColor = STATUS_COLORS[todo.status] ?? STATUS_COLORS.pending;
      const priorityColor =
        PRIORITY_COLORS[todo.priority] ?? PRIORITY_COLORS.low;
      const isCompleted = todo.status === "completed";

      return (
        <Box key={todo.id} marginLeft={2} flexDirection="column">
          <Box>
            <Text color={Colors.Gray}>{index + 1}. </Text>
            <Text color={statusColor}>{statusIcon} </Text>
            <Text
              color={isCompleted ? Colors.Gray : Colors.Foreground}
              strikethrough={isCompleted}
            >
              {todo.content}
            </Text>
            <Text color={priorityColor}> ({todo.priority})</Text>
          </Box>
        </Box>
      );
    })}
  </Box>
);

type ToolDisplayProps = {
  name: string;
  input: ReactNode;
  output: ReactNode;
};

const ToolDisplay = ({ name, input, output }: ToolDisplayProps) => (
  <Box marginY={1} flexDirection="column">
    <Box>
      <Text color={Colors.AccentGreen}>✦ {name}</Text>
      <Text color={Colors.Gray}>({input})</Text>
    </Box>
    <Box marginLeft={3}>
      <Text color={Colors.Gray}>↳ {output}</Text>
    </Box>
  </Box>
);

export const renderTool = (tool: Tool["content"]): ReactElement => {
  const returnDisplay: ReturnDisplay | undefined = tool.returnDisplay;

  if (typeof returnDisplay === "object" && returnDisplay !== null) {
    const toolInput = tool.input as Record<string, unknown> | null;

    if (returnDisplay.type === 'todo_read') {
      return (
        <Box marginY={1} flexDirection="column">
          <Box>
            <Text color={Colors.AccentGreen}>✦ {tool.name}</Text>
          </Box>
          <TodoList todos={returnDisplay.todos} />
        </Box>
      );
    }

    if (returnDisplay.type === 'todo_write') {
      return (
        <Box marginY={1} flexDirection="column">
          <Box>
            <Text color={Colors.AccentGreen}>✦ {tool.name}</Text>
          </Box>
          <TodoList todos={returnDisplay.newTodos} />
        </Box>
      );
    }

    if (returnDisplay.type === 'diff_viewer') {
      const { filePath, originalContent, newContent, startLineNumber } = returnDisplay;
      const resolvedOriginalContent =
        typeof originalContent === 'object' && 'inputKey' in originalContent
          ? (toolInput?.[originalContent.inputKey] as string) ?? ''
          : originalContent;
      const resolvedNewContent =
        typeof newContent === 'object' && 'inputKey' in newContent
          ? (toolInput?.[newContent.inputKey] as string) ?? ''
          : newContent;

      return (
        <Box marginY={1} flexDirection="column">
          <Box>
            <Text color={Colors.AccentGreen}>✦ {tool.name}</Text>
            <Text color={Colors.Gray}>({filePath})</Text>
          </Box>
          <Box marginLeft={3}>
            <DiffViewer
              originalContent={resolvedOriginalContent}
              newContent={resolvedNewContent}
              fileName={filePath}
              startLineNumber={startLineNumber}
            />
          </Box>
        </Box>
      );
    }
  }

  return (
    <ToolDisplay
      name={tool.name}
      input={tool.name == TOOL_NAMES.ASK_USER_QUESTION ? '' : JSON.stringify(tool.input)}
      output={tool.returnDisplay as string || "No return display"}
    />
  );
};
