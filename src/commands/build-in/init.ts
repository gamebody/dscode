import { BaseCommand, CommandContext } from "../command";

export class InitCommand extends BaseCommand {
  name = '/init';
  description = '初始化项目 AI 上下文 (.AGENTS.md)';

  execute(context: CommandContext, input?: string): void {
    const { appendMessage, setText, pushUIMessage, runLoop } = context;
    const fullInput = input || this.name;

    const param = fullInput.substring(this.name.length).trim();

    pushUIMessage({
      role: 'user',
      content: fullInput
    })

    const prompt = `# Generate .AGENTS.md

## Role

You are a project analyst. Your task is to explore the current project and produce a \`.AGENTS.md\` file following the standard CLAUDE.md convention — the widely adopted format used by AI coding assistants (Claude, Cursor, Copilot, etc.) to understand a project.

**Announce at start:** "I'm analyzing this project to generate .AGENTS.md."

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
- **Deployment** — how it's deployed, CI/CD if detectable

### Step 3: Generate .AGENTS.md

Write the file to \`.AGENTS.md\` in the project root.

Follow the standard CLAUDE.md conventions:

- **Start with a brief project description** — 1-2 sentences
- **Structure with concise sections**, each with bullet points
- **Always include exact commands** that AI can copy-paste (build, test, lint, dev)
- **Be specific to this project** — no placeholders or generic templates
- **Keep it scannable** — short lines, clear hierarchy, minimal prose
- **Include a "Common Operations" section** for frequently used workflows

A well-formed example:

\`\`\`markdown
# my-project

Full-stack task management app built with Next.js and Prisma.

## Tech Stack

- Next.js 14 (App Router), React, TypeScript
- Prisma ORM, PostgreSQL
- Tailwind CSS, shadcn/ui
- Vitest, Playwright

## Commands

\`\`\`
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm test         # Run unit tests
pnpm test:e2e     # Run E2E tests
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm db:push      # Push schema to DB
pnpm db:studio    # Open Prisma Studio
\`\`\`

## Project Structure

\`\`\`
src/
  app/          Next.js App Router pages and API routes
  components/   Shared React components
  lib/          Utilities, db client, helpers
  features/     Feature-specific modules
  types/        Shared TypeScript types
prisma/
  schema.prisma Database schema
\`\`\`

## Conventions

- Use named exports for components and functions
- Co-locate tests next to source files (*.test.ts)
- Barrel exports via index.ts for each directory
- Feature folders encapsulate all related files
- Database queries go through Prisma service layer

## Common Operations

- \`pnpm db:push && pnpm db:generate\` after schema changes
- \`pnpm test -- --watch\` during development
- \`pnpm lint --fix\` before committing
\`\`\`

## Rules

- Base everything ONLY on what you observe in the project.
- Use real commands, paths, and conventions found in the project.
- If something is unclear or cannot be determined, skip it.
- Do NOT include this instruction block in the output file.
- Do NOT use placeholder text like "[command]" — write the actual command or omit.
- After writing .AGENTS.md, check if .gitignore exists. If it does and .AGENTS.md is not already listed, append ".AGENTS.md" to it.
- At the very end of .AGENTS.md, add a single-line summary: <!-- AGENTS_SUMMARY --><project_name> | <1-sentence description> | <key tech stack> | <main commands>

Arguments: ${param}`;

    appendMessage({
      role: 'user',
      content: prompt,
    });
    setText('');

    runLoop()
  }
}
