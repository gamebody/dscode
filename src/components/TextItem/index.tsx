import React, { ReactElement, ReactNode, useMemo } from "react";
import { Box, Text } from "ink";
import { Tool, UIMessage } from "../../store/agent";
import UserText from "./UserText";
import { Colors } from "../../utils/colors";
import Gradient from "ink-gradient";
import { MarkdownDisplay } from "../../utils/MarkdownDisplay";

const MAX_VISIBLE_LINES = 3;

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

const TOOL_INPUT_EXTRACTORS: Record<string, (input: any) => string> = {
  read: (input) => input.file_path,
  ls: (input) => input.dir_path,
  glob: (input) => input.path || input.pattern,
  edit: (input) => input.file_path,
  write: (input) => input.file_path,
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

export type TextItemProps = UIMessage & {
  isStreaming?: boolean;
  terminalWidth?: number;
  terminalHeight?: number;
};

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

const ThinkingBlock: React.FC<{
  content: string;
  isStreaming: boolean;
  terminalWidth: number;
  terminalHeight?: number;
}> = ({ content, isStreaming, terminalWidth, terminalHeight }) => {
  const lines = useMemo(() => content.split("\n"), [content]);
  const visibleLines = useMemo(() => lines.slice(-MAX_VISIBLE_LINES), [lines]);
  const hiddenCount = lines.length - visibleLines.length;
  const text = hiddenCount > 0 ? visibleLines.join("\n") : content;

  return (
    <Box
      borderStyle="round"
      borderColor={Colors.Gray}
      flexDirection="column"
      paddingX={1}
      paddingY={0}
      marginY={1}
    >
      <Box>
        <Gradient name="rainbow">
          <Text>thinking</Text>
        </Gradient>
      </Box>
      {hiddenCount > 0 && (
        <Text color={Colors.Gray}>... {hiddenCount} lines collapsed</Text>
      )}
      <MarkdownDisplay
        availableTerminalHeight={terminalHeight}
        text={text}
        isPending={isStreaming}
        terminalWidth={terminalWidth}
      />
    </Box>
  );
};

const toolOutput = (tool: Tool["content"]): string =>
  typeof tool.returnDisplay === "string"
    ? tool.returnDisplay
    : JSON.stringify(tool.returnDisplay);

const renderTool = (tool: Tool["content"]): ReactElement => {
  const output = toolOutput(tool);
  const extractor = TOOL_INPUT_EXTRACTORS[tool.name];
  if (extractor) {
    return (
      <ToolDisplay name={tool.name} input={extractor(tool.input)} output={output} />
    );
  }

  if (tool.name === "todoRead") {
    const todoData = tool.returnDisplay as {
      type: "todo_read";
      todos: TodoItem[];
    };
    return (
      <Box marginY={1} flexDirection="column">
        <Box>
          <Text color={Colors.AccentGreen}>✦ {tool.name}</Text>
        </Box>
        <TodoList todos={todoData.todos} />
      </Box>
    );
  }

  if (tool.name === "todoWrite") {
    const todoData = tool.returnDisplay as {
      type: "todo_write";
      newTodos: TodoItem[];
    };
    return (
      <Box marginY={1} flexDirection="column">
        <Box>
          <Text color={Colors.AccentGreen}>✦ {tool.name}</Text>
        </Box>
        <TodoList todos={todoData.newTodos} />
      </Box>
    );
  }

  return (
    <ToolDisplay
      name={tool.name}
      input={JSON.stringify(tool.input)}
      output={output}
    />
  );
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
          <MarkdownDisplay
            availableTerminalHeight={terminalHeight}
            text={content as string}
            isPending={!!isStreaming}
            terminalWidth={terminalWidth ?? 80}
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
      default:
        return <Text>{JSON.stringify(content)}</Text>;
    }
  };

  return <Box flexDirection="column">{renderContent()}</Box>;
};

export default React.memo(TextItem);
