import React, { ReactElement, ReactNode, useMemo } from "react";
import { Box, Text } from "ink";
import { Tool, UIMessage } from "../../store/agent";
import UserText from "./UserText";
import { Colors } from "../../utils/colors";
import Gradient from "ink-gradient";
import { MarkdownDisplay } from "../../utils/MarkdownDisplay";



export type TextItemProps = UIMessage & {
  isStreaming?: boolean;
  terminalWidth?: number;
  terminalHeight?: number;
}


type ToolDispalyProps = {
  name: string
  input: ReactNode
  output: ReactNode
}

const ToolDispaly = ({ name, input, output }: ToolDispalyProps) => {
  return (
    <Box marginY={1} flexDirection='column'>
      <Box>
        <Text color={Colors.AccentGreen}>
          ✦ {name}
        </Text>
        <Text color={Colors.Gray}>
          ({input})
        </Text>
      </Box>
      <Box marginLeft={3}>
        <Text color={Colors.Gray}>
            ↳ {output}
        </Text>
      </Box>
    </Box>
  )
};

const MAX_VISIBLE_LINES = 3;

const ThinkingBlock: React.FC<{ content: string; isStreaming: boolean; terminalWidth: number; terminalHeight?: number }> = ({ content, isStreaming, terminalWidth, terminalHeight }) => {
  const lines = useMemo(() => content.split('\n'), [content]);
  const visibleLines = useMemo(() => lines.slice(-MAX_VISIBLE_LINES), [lines]);
  const hiddenCount = lines.length - visibleLines.length;
  const text = hiddenCount > 0 ? visibleLines.join('\n') : content;

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
        <Text color={Colors.Gray}>
          ... {hiddenCount} lines collapsed
        </Text>
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

const TextItem: React.FC<TextItemProps> = ({ role, content, isStreaming, terminalWidth, terminalHeight }) => {


  const renderTool = (tool: Tool['content']) => {
    
    const output = typeof tool.returnDisplay == 'string' ? tool.returnDisplay : JSON.stringify(tool.returnDisplay)
    if (tool.name == 'read') {
      return (
        <ToolDispaly
          name={tool.name}
          input={tool.input.file_path}
          output={output} />
      )
    } else if (tool.name == 'ls') {
      return (
        <ToolDispaly
          name={tool.name}
          input={tool.input.dir_path}
          output={output} />
      )
    } else if (tool.name == 'glob') {
      return (
        <ToolDispaly
          name={tool.name}
          input={tool.input.path || tool.input.pattern}
          output={output} />
      )
    } else if (tool.name == 'edit') {
      return (
        <ToolDispaly
          name={tool.name}
          input={tool.input.file_path}
          output={output} />
      )
    } else if (tool.name == 'write') {
      return (
        <ToolDispaly
          name={tool.name}
          input={tool.input.file_path}
          output={output} />
      )
    } else if (tool.name == 'todoRead') {
      const todoData = tool.returnDisplay as { type: 'todo_read', todos: Array<{ status: string, id: string, content: string, priority: string }> };
      const todos = todoData.todos;
      return (
        <Box marginY={1} flexDirection='column'>
          <Box>
            <Text color={Colors.AccentGreen}>
              ✦ {tool.name}
            </Text>
          </Box>
          <Box marginLeft={3} flexDirection='column'>
            <Text color={Colors.Gray}>
              ↳ Todos ({todos.length}):
            </Text>
            {todos.map((todo, index) => (
              <Box key={todo.id} marginLeft={2} flexDirection='column'>
                <Text color={Colors.Gray}>
                  {index + 1}. [{todo.status}] {todo.content} (priority: {todo.priority})
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      );
    } else if (tool.name == 'todoWrite') {
      const todoData = tool.returnDisplay as { type: 'todo_write', oldTodos: Array<{ status: string, id: string, content: string, priority: string }>, newTodos: Array<{ status: string, id: string, content: string, priority: string }> };
      const newTodos = todoData.newTodos;
      
      const getStatusIcon = (status: string) => {
        if (status === 'completed') return '✓';
        if (status === 'in_progress') return '⟳';
        return '☐';
      };

      const getStatusColor = (status: string) => {
        if (status === 'completed') return Colors.AccentGreen;
        if (status === 'in_progress') return Colors.AccentYellow;
        return Colors.Gray;
      };

      const getPriorityColor = (priority: string) => {
        if (priority === 'high') return Colors.AccentRed;
        if (priority === 'medium') return Colors.AccentYellow;
        return Colors.AccentGreen;
      };

      return (
        <Box marginY={1} flexDirection='column'>
          <Box>
            <Text color={Colors.AccentGreen}>
              ✦ {tool.name}
            </Text>
          </Box>
          <Box marginLeft={3} flexDirection='column'>
            <Text color={Colors.Gray}>
              ↳ Todos ({newTodos.length}):
            </Text>
            {newTodos.map((todo, index) => {
              const statusIcon = getStatusIcon(todo.status);
              const statusColor = getStatusColor(todo.status);
              const priorityColor = getPriorityColor(todo.priority);
              const isCompleted = todo.status === 'completed';
              
              return (
                <Box key={todo.id} marginLeft={2} flexDirection='column'>
                  <Box>
                    <Text color={Colors.Gray}>
                      {index + 1}.{' '}
                    </Text>
                    <Text color={statusColor}>
                      {statusIcon}{' '}
                    </Text>
                    <Text 
                      color={isCompleted ? Colors.Gray : Colors.Foreground} 
                      strikethrough={isCompleted}
                    >
                      {todo.content}
                    </Text>
                    <Text color={priorityColor}>
                      {' '}({todo.priority})
                    </Text>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      );
    } else if (tool.name == 'askUserQuestion') {
      return (
        <ToolDispaly
        name={(tool as any).name}
        input={''}
        output={output} />
      )
    }


    return (
      <ToolDispaly
        name={(tool as any).name}
        input={JSON.stringify((tool as any).input)}
        output={output} />
    )
  }

  return (
    <Box flexDirection='column'>
      {
        role === 'user' ? <UserText text={content} /> :
        role === 'assistant' ? <MarkdownDisplay availableTerminalHeight={terminalHeight} text={content as string} isPending={!!isStreaming} terminalWidth={terminalWidth ?? 80} /> :
        role === 'thinking' ? <ThinkingBlock content={content as string} isStreaming={!!isStreaming} terminalWidth={terminalWidth ?? 80} terminalHeight={terminalHeight} /> :
        role === 'tool' ? renderTool(content) :
        <Text>{JSON.stringify(content)}</Text>
      }
    </Box>
  );

};

export default React.memo(TextItem)
