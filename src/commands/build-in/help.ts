import { BaseCommand, CommandContext } from "../command";

const HELP_CONTENT = `# ONECODER 帮助

## 快捷键

| 快捷键 | 功能 |
|---|---|
| Shift + Tab | 切换 Agent / YOLO 模式 |
| Tab | 循环思考模式: off → high → max |
| Ctrl + C (两次) | 安全退出程序 |
| @ | 触发文件路径搜索，Tab 或 Enter 选择 |
| ↑ / ↓ | 在候选项中移动选择 |
| Enter | 提交输入或确认选择 |
| Esc | 取消当前 AI 操作 |

## 模式说明

### Agent 模式 vs YOLO 模式
- **Agent**: 执行写文件和运行命令前需要用户确认，适合谨慎操作
- **YOLO**: AI 自动执行所有操作，无需确认，适合高度信任的场景

### 思考模式
- **off**: 不显示思考过程，响应更快
- **high**: 显示思考过程，推理更充分
- **max**: 最大化思考深度，适合复杂问题
`;

export class HelpCommand extends BaseCommand {
  name = '/help';
  description = '显示帮助文档';

  execute(context: CommandContext, input: string): void {
    const { pushUIMessage, setText, } = context;

    pushUIMessage({
      role: 'user',
      content: input
    })

    pushUIMessage({
      role: 'assistant',
      content: HELP_CONTENT,
    });

    setText('');
  }
}
