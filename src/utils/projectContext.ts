import fs from "fs";
import path from "path";

const AGENTS_FILE = ".AGENTS.md";
const SUMMARY_MARKER = "<!-- AGENTS_SUMMARY -->";

export function readProjectSummary(cwd: string): string {
  const filePath = path.join(cwd, AGENTS_FILE);
  if (!fs.existsSync(filePath)) {
    return "";
  }
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return extractSummary(content);
  } catch {
    return "";
  }
}

export function readProjectFullContext(cwd: string): string {
  const filePath = path.join(cwd, AGENTS_FILE);
  if (!fs.existsSync(filePath)) {
    return "No .AGENTS.md found in project root.";
  }
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "Failed to read .AGENTS.md.";
  }
}

function extractSummary(content: string): string {
  const summaryLine = content
    .split("\n")
    .find((line) => line.trim().startsWith(SUMMARY_MARKER));
  if (summaryLine) {
    const text = summaryLine.replace(SUMMARY_MARKER, "").trim();
    if (text) return text;
  }

  const lines = content.split("\n");
  const sections: string[] = [];
  let currentSection = "";
  let inTargetSection = false;

  for (const line of lines) {
    if (line.startsWith("## Tech Stack") || line.startsWith("## Commands")) {
      inTargetSection = true;
      currentSection = line.replace(/^## /, "").trim();
      sections.push(currentSection);
      continue;
    }
    if (line.startsWith("## ") && inTargetSection) {
      inTargetSection = false;
    }
    if (inTargetSection) {
      const trimmed = line.trim();
      if (trimmed) {
        sections.push(trimmed);
      }
    }
  }

  const firstLine = lines[1]?.trim() || "";
  const summary = [firstLine, ...sections].filter(Boolean).join("\n");
  return summary || "";
}
