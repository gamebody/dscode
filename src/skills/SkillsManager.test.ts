import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import fs from "fs";
import path from "path";
import { SkillsManager, SkillMeta } from "./SkillsManager";

const testDir = path.join(import.meta.dir, "../..", ".test-skills-tmp");

function createSkillDir(name: string, frontmatter: string, body: string) {
  const dir = path.join(testDir, ".agents", "skills", name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "SKILL.md"), `---\n${frontmatter}\n---\n${body}`);
}

function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

beforeAll(() => {
  cleanup();
  createSkillDir("bun", "name: Bun\ndescription: JavaScript runtime, package manager", "# Bun\nContent here");
  createSkillDir("react", "name: React\ndescription: UI library", "# React\nContent here");
  createSkillDir("nofrontmatter", "", "# No Frontmatter\nContent");
});

afterAll(() => {
  cleanup();
});

describe("SkillsManager", () => {
  describe("list", () => {
    it("should return empty array if directory does not exist", () => {
      const mgr = new SkillsManager("/nonexistent/path");
      expect(mgr.list()).toEqual([]);
    });

    it("should parse YAML frontmatter and return skill metas", () => {
      const mgr = new SkillsManager(testDir);
      const result = mgr.list();
      expect(result.length).toBe(3);

      const bun = result.find((s) => s.name === "Bun");
      expect(bun).toBeDefined();
      expect(bun!.description).toBe("JavaScript runtime, package manager");

      const react = result.find((s) => s.name === "React");
      expect(react).toBeDefined();
      expect(react!.description).toBe("UI library");

      const nf = result.find((s) => s.name === "nofrontmatter");
      expect(nf).toBeDefined();
      expect(nf!.description).toBe("");
    });

    it("should skip directories without SKILL.md", () => {
      const mgr = new SkillsManager(testDir);
      const emptyDir = path.join(testDir, ".agents", "skills", "empty");
      fs.mkdirSync(emptyDir, { recursive: true });
      const result = mgr.list();
      expect(result.length).toBe(3);
    });
  });

  describe("loadContent", () => {
    it("should return full content for existing skill", () => {
      const mgr = new SkillsManager(testDir);
      const result = mgr.loadContent("bun");
      expect(result).not.toBeNull();
      expect(result!.content).toContain("# Bun");
      expect(result!.content).toContain("name: Bun");
      expect(result!.cached).toBe(false);
    });

    it("should cache content on subsequent calls", () => {
      const mgr = new SkillsManager(testDir);
      mgr.loadContent("bun");
      const result = mgr.loadContent("bun");
      expect(result).not.toBeNull();
      expect(result!.cached).toBe(true);
    });

    it("should return null for non-existent skill", () => {
      const mgr = new SkillsManager(testDir);
      expect(mgr.loadContent("nonexistent")).toBeNull();
    });
  });

  describe("formatSummary", () => {
    it("should return empty string for empty skills", () => {
      const mgr = new SkillsManager("/nonexistent/path");
      expect(mgr.formatSummary()).toBe("");
    });

    it("should format skill list with descriptions", () => {
      const mgr = new SkillsManager(testDir);
      // Clear the nofrontmatter and empty dir first
      const summary = mgr.formatSummary([
        { name: "Bun", description: "JS runtime" },
        { name: "React", description: "UI library" },
      ]);
      expect(summary).toContain("## Available Skills");
      expect(summary).toContain("**Bun**: JS runtime");
      expect(summary).toContain("**React**: UI library");
      expect(summary).toContain("`skill` tool");
    });

    it("should use list() when no argument given", () => {
      const mgr = new SkillsManager(testDir);
      const summary = mgr.formatSummary();
      expect(summary).toContain("## Available Skills");
      expect(summary).toContain("**Bun**");
      expect(summary).toContain("**React**");
    });
  });
});
