import fs from "fs";
import path from "path";

export interface SkillMeta {
  name: string;
  description: string;
}

export class SkillsManager {
  private cwd: string;
  private contentCache = new Map<string, string>();

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  get skillsDir(): string {
    return path.join(this.cwd, ".agents", "skills");
  }

  list(): SkillMeta[] {
    const skillsDir = this.skillsDir;
    if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) {
      return [];
    }

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    const skills: SkillMeta[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillFile = path.join(skillsDir, entry.name, "SKILL.md");
      if (!fs.existsSync(skillFile)) {
        console.warn(`[skills] No SKILL.md found in ${entry.name}/, skipping`);
        continue;
      }

      const meta = this.parseSkillFrontmatter(skillFile, entry.name);
      skills.push(meta);
    }

    return skills;
  }

  loadContent(skillName: string): { content: string; cached: boolean } | null {
    const cached = this.contentCache.get(skillName);
    if (cached !== undefined) {
      return { content: cached, cached: true };
    }

    const skillFile = path.join(this.skillsDir, skillName, "SKILL.md");
    if (!fs.existsSync(skillFile)) {
      return null;
    }
    try {
      const content = fs.readFileSync(skillFile, "utf-8");
      this.contentCache.set(skillName, content);
      return { content, cached: false };
    } catch {
      return null;
    }
  }

  get cwdPath(): string {
    return this.cwd;
  }

  formatSummary(skills?: SkillMeta[]): string {
    const list = skills ?? this.list();
    if (list.length === 0) return "";

    const header = "## Available Skills\n\n";
    const body = list
      .map((s) => `- **${s.name}**: ${s.description}`)
      .join("\n");
    const footer =
      '\n\nUse the `skill` tool to load the full content of a skill when needed by passing the skill name (e.g., `"bun"`).';

    return header + body + footer;
  }

  private parseSkillFrontmatter(filePath: string, dirName: string): SkillMeta {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split(/\r?\n/);

      if (lines[0]?.trim() !== "---") {
        return { name: dirName, description: "" };
      }

      const endIndex = lines.slice(1).findIndex((line) => line.trim() === "---");
      if (endIndex === -1) {
        return { name: dirName, description: "" };
      }

      const frontmatterLines = lines.slice(1, endIndex + 1);
      const meta: { name?: string; description?: string } = {};

      for (const line of frontmatterLines) {
        const match = line.match(/^(\w+):\s*(.*)$/);
        if (match) {
          const key = (match[1] ?? "").trim();
          const value = (match[2] ?? "").trim();
          if (key === "name") meta.name = value;
          if (key === "description") meta.description = value;
        }
      }

      return {
        name: meta.name || dirName,
        description: meta.description || "",
      };
    } catch (error) {
      console.error(
        `[skills] Failed to read ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
      return { name: dirName, description: "" };
    }
  }
}
