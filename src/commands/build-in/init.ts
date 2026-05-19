import { BaseCommand, CommandContext } from "../command";

export class InitCommand extends BaseCommand {
  name = '/init';
  description = '初始化项目 AI 上下文 (Skill)';

  execute(context: CommandContext, input?: string): void {
    const { appendMessage, setText, pushUIMessage, runLoop } = context;
    const fullInput = input || this.name;

    const param = fullInput.substring(this.name.length).trim();

    pushUIMessage({
      role: 'user',
      content: fullInput
    })

    const prompt = `# Generate Project Skill

## Role

You are a project analyst. Your task is to explore the current project and produce a comprehensive technical reference document as a skill file at \`.agents/skills/project/SKILL.md\`. This skill will be loaded by the AI assistant to understand the project's tech stack, structure, conventions, and commands.

**Announce at start:** "我将分析此项目并生成项目 Skill 文件。"

**Language:** Please communicate in chinese.

## Process

### Step 1: Explore the project
- Use \`ls\` to list root directory
- Use \`glob\` to explore \`src/**/*\`, \`lib/**/*\`, \`app/**/*\`, etc.
- Read \`package.json\` (or \`Cargo.toml\`, \`pyproject.toml\`, \`Gemfile\`, etc.)
- Read \`README.md\`, \`tsconfig.json\`, \`Makefile\`, \`Dockerfile\`, etc. if they exist

### Step 2: Analyze
Identify:
- **Project purpose** — from README, package.json description, or code clues
- **Tech stack** — language, runtime, framework, key libraries, database
- **Directory structure** — meaningful grouping and conventions
- **Build system** — how to build, bundle, compile
- **Test strategy** — framework, where tests live, how to run them
- **Dev commands** — dev server, lint, typecheck, test, build
- **Coding conventions** — style, naming, patterns observed in the code

### Step 3: Generate SKILL.md

Write the file to \`.agents/skills/project/SKILL.md\` in the project root.

The file MUST use YAML frontmatter followed by Markdown:

\`\`\`markdown
---
name: project
description: <1句话项目描述>
---

# <项目名>

<1段简介>

## Tech Stack
- <运行时>: <版本>
- ...

## Commands
\`\`\`
cmd1  # 说明
cmd2  # 说明
\`\`\`

## Project Structure
\`\`\`
src/
  xxx/  用途
\`\`\`

## Conventions
- <约定>

## Common Operations
- \`cmd\` — 说明
\`\`\`

A well-formed example:

\`\`\`markdown
---
name: project
description: CLI-based AI coding assistant built with Ink (React for terminal UIs)
---

# dscode

CLI-based AI coding assistant built with Ink (React for terminal UIs).

## Tech Stack
- **Runtime**: Bun (v1.3+)
- **Language**: TypeScript, React (TSX)
- **UI**: Ink v6 (React renderer for terminal)
- **AI**: Vercel AI SDK (ai v5), OpenAI-compatible provider
- **State**: Zustand + Immer
- **Validation**: Zod
- **CLI**: yargs
- **Themes**: Built-in syntax highlighting themes (15+ themes)

## Commands
\`\`\`
bun dev              # Start dev server with --watch
bun build            # Production bundle -> bundle/dscode.js
bun test             # Run tests (bun test)
bun install          # Install dependencies
bunx dscode          # Run the CLI tool (if linked)
\`\`\`

## Project Structure
\`\`\`
index.tsx                     Entry point — renders Ink app
src/
  App.tsx                     Root component
  agent/                      AI agent engine
  commands/                   Command system
  components/                 Ink UI components
  contexts/                   React contexts
  store/                      Zustand stores
  themes/                     Terminal color themes (15+ themes)
  utils/                      Utilities
\`\`\`

## Conventions
- Use \`.js\` extension in import paths (Bun convention for ESM)
- Functional React components with Ink primitives (Box, Text, etc.)
- Zustand stores accessed via \`useStoreContext\` hook
- Built-in commands extend \`BaseCommand\` abstract class

## Common Operations
- \`bun dev\` — start in watch mode for development
- \`bun build\` — build production bundle
- \`bun test\` — run all tests
\`\`\`

## Rules

- Base everything ONLY on what you observe in the project.
- Use real commands, paths, and conventions found in the project.
- If something is unclear or cannot be determined, skip it.
- Do NOT include this instruction block in the output file.
- Do NOT use placeholder text like "[command]" — write the actual command or omit.
- The \`name\` field in frontmatter MUST be \`project\`.
- The \`description\` field in frontmatter MUST be one concise sentence.
- After writing SKILL.md, check if .gitignore exists. If it does and ".agents" is not already listed, append ".agents" to it.

Arguments: ${param}`;

    appendMessage({
      role: 'user',
      content: prompt,
    });
    setText('');

    runLoop()
  }
}
