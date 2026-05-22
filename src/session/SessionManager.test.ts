import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import fs from "fs";
import path from "path";
import { SessionManager, SessionSummary, ParsedSession, DateGroup } from "./SessionManager";

const testDir = path.join(import.meta.dir, "../..", ".test-sessions-tmp");

function writeTestFile(
  dateStr: string,
  sessionId: string,
  lines: Array<{ t: string; mm: Record<string, unknown>; returnDisplay?: unknown }>,
) {
  const dir = path.join(testDir, dateStr);
  fs.mkdirSync(dir, { recursive: true });
  const content = lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
  fs.writeFileSync(path.join(dir, `${sessionId}.jsonl`), content);
}

function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

beforeAll(() => {
  cleanup();

  writeTestFile("2025-01-15", "session-1", [
    {
      t: "2025-01-15 10:00:00",
      mm: { role: "user", content: "Hello, this is a first message that asks a question about code" },
    },
    {
      t: "2025-01-15 10:00:05",
      mm: { role: "assistant", content: "Hi! I can help with that." },
    },
    {
      t: "2025-01-15 10:00:10",
      mm: { role: "user", content: "Thanks!" },
    },
  ]);

  writeTestFile("2025-01-15", "session-2", [
    {
      t: "2025-01-15 14:00:00",
      mm: { role: "user", content: "Short message" },
    },
  ]);

  writeTestFile("2025-01-14", "older-session", [
    {
      t: "2025-01-14 09:00:00",
      mm: { role: "user", content: "A".repeat(100) },
    },
    {
      t: "2025-01-14 09:00:05",
      mm: { role: "assistant", content: "Reply" },
    },
  ]);

  writeTestFile("2025-01-16", "tool-session", [
    {
      t: "2025-01-16 12:00:00",
      mm: { role: "user", content: "Run a command" },
    },
    {
      t: "2025-01-16 12:00:05",
      mm: {
        role: "assistant",
        content: null,
        reasoning_content: "I need to run bash",
        tool_calls: [
          {
            id: "call_123",
            type: "function",
            function: { name: "bash", arguments: '{"command":"echo hi"}' },
          },
        ],
      },
    },
    {
      t: "2025-01-16 12:00:08",
      mm: {
        role: "tool",
        tool_call_id: "call_123",
        content: "hi",
      },
    },
    {
      t: "2025-01-16 12:00:10",
      mm: { role: "assistant", content: "Done!" },
    },
  ]);

  // empty file
  fs.mkdirSync(path.join(testDir, "2025-01-16"), { recursive: true });
  fs.writeFileSync(path.join(testDir, "2025-01-16", "empty-session.jsonl"), "");

  // corrupted lines mixed with valid
  writeTestFile("2025-01-16", "corrupted-session", [
    {
      t: "2025-01-16 08:00:00",
      mm: { role: "user", content: "Valid" },
    } as any,
  ]);
  fs.appendFileSync(
    path.join(testDir, "2025-01-16", "corrupted-session.jsonl"),
    "this is not valid json\n",
  );

  // non-date directory
  fs.mkdirSync(path.join(testDir, "not-a-date"), { recursive: true });
  fs.writeFileSync(path.join(testDir, "not-a-date", "test.jsonl"), "{}");
});

afterAll(() => {
  cleanup();
});

describe("SessionManager", () => {
  describe("scanSessions", () => {
    it("should return empty array if directory does not exist", async () => {
      const mgr = new SessionManager("/nonexistent/path");
      const result = await mgr.scanSessions();
      expect(result).toEqual([]);
    });

    it("should return empty array if directory exists but has no date folders", async () => {
      const emptyDir = path.join(testDir, ".empty-tmp");
      fs.mkdirSync(emptyDir, { recursive: true });
      try {
        const mgr = new SessionManager(emptyDir);
        const result = await mgr.scanSessions();
        expect(result).toEqual([]);
      } finally {
        fs.rmSync(emptyDir, { recursive: true, force: true });
      }
    });

    it("should ignore non-date-named directories", async () => {
      const mgr = new SessionManager(testDir);
      const result = await mgr.scanSessions();
      const hasNotADate = result.some((g) => g.date === "not-a-date");
      expect(hasNotADate).toBe(false);
    });

    it("should return date groups sorted descending by date", async () => {
      const mgr = new SessionManager(testDir);
      const result = await mgr.scanSessions();
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result[0]!.date).toBe("2025-01-16");
      expect(result[1]!.date).toBe("2025-01-15");
      expect(result[2]!.date).toBe("2025-01-14");
    });

    it("should return correct SessionSummary fields", async () => {
      const mgr = new SessionManager(testDir);
      const result = await mgr.scanSessions();

      const jan15 = result.find((g) => g.date === "2025-01-15")!;
      expect(jan15).toBeDefined();
      expect(jan15.sessions.length).toBe(2);

      const s1 = jan15.sessions.find((s) => s.sessionId === "session-1")!;
      expect(s1).toBeDefined();
      expect(s1.date).toBe("2025-01-15");
      expect(s1.messageCount).toBe(3);
      expect(s1.firstTime).toBe("2025-01-15 10:00:00");
      expect(s1.lastTime).toBe("2025-01-15 10:00:10");
      expect(s1.firstMessage).toContain("Hello, this is a first message");
      expect(s1.filePath).toContain("session-1.jsonl");
    });

    it("should truncate firstMessage longer than 80 characters", async () => {
      const mgr = new SessionManager(testDir);
      const result = await mgr.scanSessions();

      const jan14 = result.find((g) => g.date === "2025-01-14")!;
      const older = jan14.sessions.find((s) => s.sessionId === "older-session")!;
      expect(older.firstMessage).toBe("A".repeat(80) + "...");
    });

    it("should skip empty jsonl files", async () => {
      const mgr = new SessionManager(testDir);
      const result = await mgr.scanSessions();

      const jan16 = result.find((g) => g.date === "2025-01-16")!;
      const hasEmpty = jan16.sessions.some((s) => s.sessionId === "empty-session");
      expect(hasEmpty).toBe(false);
    });

    it("should handle corrupted lines gracefully (skips them but counts all non-empty lines)", async () => {
      const mgr = new SessionManager(testDir);
      const result = await mgr.scanSessions();

      const jan16 = result.find((g) => g.date === "2025-01-16")!;
      const corrupted = jan16.sessions.find((s) => s.sessionId === "corrupted-session")!;
      expect(corrupted).toBeDefined();
      expect(corrupted.messageCount).toBe(2);
    });

    it("should sort sessions within a date group by lastTime descending", async () => {
      const mgr = new SessionManager(testDir);
      const result = await mgr.scanSessions();

      const jan15 = result.find((g) => g.date === "2025-01-15")!;
      const times = jan15.sessions.map((s) => s.lastTime);
      expect(times[0]!.localeCompare(times[1]!)).toBeGreaterThanOrEqual(0);
    });

    it("should handle user messages with non-string content", async () => {
      writeTestFile("2025-01-17", "complex-content", [
        {
          t: "2025-01-17 10:00:00",
          mm: { role: "user", content: ["part1", "part2"] },
        },
      ]);
      const mgr = new SessionManager(testDir);
      const result = await mgr.scanSessions();

      const jan17 = result.find((g) => g.date === "2025-01-17")!;
      const session = jan17.sessions.find((s) => s.sessionId === "complex-content")!;
      expect(session.firstMessage).toBe('["part1","part2"]');
    });

    it("should handle user messages with null/undefined content", async () => {
      writeTestFile("2025-01-17", "null-content", [
        {
          t: "2025-01-17 11:00:00",
          mm: { role: "user", content: null },
        },
      ]);
      const mgr = new SessionManager(testDir);
      const result = await mgr.scanSessions();

      const jan17 = result.find((g) => g.date === "2025-01-17")!;
      const session = jan17.sessions.find((s) => s.sessionId === "null-content")!;
      expect(session.firstMessage).toBe("");
    });
  });

  describe("loadSession", () => {
    it("should return correct sessionId from file path", async () => {
      const mgr = new SessionManager(testDir);
      const filePath = path.join(testDir, "2025-01-15", "session-1.jsonl");
      const result = await mgr.loadSession(filePath);
      expect(result.sessionId).toBe("session-1");
    });

    it("should parse user messages correctly", async () => {
      const mgr = new SessionManager(testDir);
      const filePath = path.join(testDir, "2025-01-15", "session-2.jsonl");
      const result = await mgr.loadSession(filePath);

      expect(result.messages.length).toBe(1);
      expect(result.uiMessages.length).toBe(1);
      expect(result.uiMessages[0]!.role).toBe("user");
      expect(result.uiMessages[0]!.content).toBe("Short message");
    });

    it("should parse assistant messages with content", async () => {
      const mgr = new SessionManager(testDir);
      const filePath = path.join(testDir, "2025-01-15", "session-1.jsonl");
      const result = await mgr.loadSession(filePath);

      const assistantMsgs = result.uiMessages.filter((m) => m.role === "assistant");
      expect(assistantMsgs.length).toBe(1);
      expect(assistantMsgs[0]!.content).toBe("Hi! I can help with that.");
    });

    it("should handle assistant messages with reasoning_content", async () => {
      const mgr = new SessionManager(testDir);
      const filePath = path.join(testDir, "2025-01-16", "tool-session.jsonl");
      const result = await mgr.loadSession(filePath);

      const thinkingMsgs = result.uiMessages.filter((m) => m.role === "thinking");
      expect(thinkingMsgs.length).toBe(1);
      expect(thinkingMsgs[0]!.content).toBe("I need to run bash");
    });

    it("should handle assistant messages with tool_calls and no content", async () => {
      const mgr = new SessionManager(testDir);
      const filePath = path.join(testDir, "2025-01-16", "tool-session.jsonl");
      const result = await mgr.loadSession(filePath);

      // tool_calls assistant should not create a uiMessage with null content
      const assistantMsgs = result.uiMessages.filter((m) => m.role === "assistant");
      // Only the final "Done!" assistant message, not the tool_calls one (content is null)
      expect(assistantMsgs.length).toBe(1);
      expect(assistantMsgs[0]!.content).toBe("Done!");
    });

    it("should parse tool messages with correct fields", async () => {
      const mgr = new SessionManager(testDir);
      const filePath = path.join(testDir, "2025-01-16", "tool-session.jsonl");
      const result = await mgr.loadSession(filePath);

      const toolMsgs = result.uiMessages.filter((m) => m.role === "tool");
      expect(toolMsgs.length).toBe(1);

      const toolContent = toolMsgs[0]!.content as any;
      expect(toolContent.toolCallId).toBe("call_123");
      expect(toolContent.toolName).toBe("bash");
      expect(toolContent.name).toBe("bash");
      expect(toolContent.state).toBe("done");
      expect(toolContent.input).toEqual({ command: "echo hi" });
      expect(toolContent.output).toBe("hi");
    });

    it("should handle tool messages with non-string content", async () => {
      writeTestFile("2025-01-17", "tool-obj-content", [
        {
          t: "2025-01-17 12:00:00",
          mm: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_456",
                type: "function",
                function: { name: "read", arguments: '{"file":"test.txt"}' },
              },
            ],
          },
        },
        {
          t: "2025-01-17 12:00:05",
          mm: {
            role: "tool",
            tool_call_id: "call_456",
            content: { result: "file content here" },
          },
        },
      ]);
      const mgr = new SessionManager(testDir);
      const filePath = path.join(testDir, "2025-01-17", "tool-obj-content.jsonl");
      const result = await mgr.loadSession(filePath);

      const toolMsgs = result.uiMessages.filter((m) => m.role === "tool");
      expect(toolMsgs.length).toBe(1);
      const toolContent = toolMsgs[0]!.content as any;
      expect(toolContent.output).toBe('{"result":"file content here"}');
    });

    it("should handle tool messages with JSON-string content that parses correctly", async () => {
      writeTestFile("2025-01-17", "tool-json-content", [
        {
          t: "2025-01-17 13:00:00",
          mm: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_789",
                type: "function",
                function: { name: "glob", arguments: '{"pattern":"*.ts"}' },
              },
            ],
          },
        },
        {
          t: "2025-01-17 13:00:05",
          mm: {
            role: "tool",
            tool_call_id: "call_789",
            content: '{"files":["a.ts","b.ts"]}',
          },
        },
      ]);
      const mgr = new SessionManager(testDir);
      const filePath = path.join(testDir, "2025-01-17", "tool-json-content.jsonl");
      const result = await mgr.loadSession(filePath);

      const toolMsgs = result.uiMessages.filter((m) => m.role === "tool");
      expect(toolMsgs.length).toBe(1);
      const toolContent = toolMsgs[0]!.content as any;
      expect(toolContent.output).toEqual({ files: ["a.ts", "b.ts"] });
    });

    it("should handle tool messages with unknown tool_call_id gracefully", async () => {
      writeTestFile("2025-01-17", "tool-unknown-id", [
        {
          t: "2025-01-17 14:00:00",
          mm: {
            role: "tool",
            tool_call_id: "unknown_call_id",
            content: "some output",
          },
        },
      ]);
      const mgr = new SessionManager(testDir);
      const filePath = path.join(testDir, "2025-01-17", "tool-unknown-id.jsonl");
      const result = await mgr.loadSession(filePath);

      const toolMsgs = result.uiMessages.filter((m) => m.role === "tool");
      expect(toolMsgs.length).toBe(1);
      const toolContent = toolMsgs[0]!.content as any;
      expect(toolContent.toolName).toBe("");
    });

    it("should handle corrupted lines by skipping them", async () => {
      const mgr = new SessionManager(testDir);
      const filePath = path.join(testDir, "2025-01-16", "corrupted-session.jsonl");
      const result = await mgr.loadSession(filePath);

      expect(result.messages.length).toBe(1);
      expect(result.uiMessages.length).toBe(1);
    });

    it("should handle empty files", async () => {
      const mgr = new SessionManager(testDir);
      const filePath = path.join(testDir, "2025-01-16", "empty-session.jsonl");
      const result = await mgr.loadSession(filePath);

      expect(result.sessionId).toBe("empty-session");
      expect(result.messages).toEqual([]);
      expect(result.uiMessages).toEqual([]);
    });

    it("should include returnDisplay in tool uiMessages when present", async () => {
      writeTestFile("2025-01-17", "tool-with-return", [
        {
          t: "2025-01-17 15:00:00",
          mm: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_return",
                type: "function",
                function: { name: "bash", arguments: '{"command":"ls"}' },
              },
            ],
          },
        },
        {
          t: "2025-01-17 15:00:05",
          returnDisplay: { type: "bash", output: "file1\nfile2" },
          mm: {
            role: "tool",
            tool_call_id: "call_return",
            content: '"file1\\nfile2"',
          },
        },
      ]);
      const mgr = new SessionManager(testDir);
      const filePath = path.join(testDir, "2025-01-17", "tool-with-return.jsonl");
      const result = await mgr.loadSession(filePath);

      const toolMsgs = result.uiMessages.filter((m) => m.role === "tool");
      expect(toolMsgs.length).toBe(1);
      const toolContent = toolMsgs[0]!.content as any;
      expect(toolContent.returnDisplay).toEqual({ type: "bash", output: "file1\nfile2" });
    });

    it("should handle tool_calls with invalid JSON arguments", async () => {
      writeTestFile("2025-01-17", "bad-args", [
        {
          t: "2025-01-17 16:00:00",
          mm: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_bad_args",
                type: "function",
                function: { name: "bash", arguments: "not-valid-json" },
              },
            ],
          },
        },
        {
          t: "2025-01-17 16:00:05",
          mm: {
            role: "tool",
            tool_call_id: "call_bad_args",
            content: "ok",
          },
        },
      ]);
      const mgr = new SessionManager(testDir);
      const filePath = path.join(testDir, "2025-01-17", "bad-args.jsonl");
      const result = await mgr.loadSession(filePath);

      const toolMsgs = result.uiMessages.filter((m) => m.role === "tool");
      expect(toolMsgs.length).toBe(1);
      const toolContent = toolMsgs[0]!.content as any;
      expect(toolContent.input).toEqual({});
    });

    it("should handle user messages with array content as string", async () => {
      writeTestFile("2025-01-17", "array-content", [
        {
          t: "2025-01-17 17:00:00",
          mm: { role: "user", content: [{ type: "text", text: "hello" }] },
        },
      ]);
      const mgr = new SessionManager(testDir);
      const filePath = path.join(testDir, "2025-01-17", "array-content.jsonl");
      const result = await mgr.loadSession(filePath);

      expect(result.uiMessages[0]!.role).toBe("user");
      expect(result.uiMessages[0]!.content).toBe('[{"type":"text","text":"hello"}]');
    });

    it("should handle assistant messages with array content", async () => {
      writeTestFile("2025-01-17", "assistant-array", [
        {
          t: "2025-01-17 18:00:00",
          mm: { role: "assistant", content: ["line1", "line2"] },
        },
      ]);
      const mgr = new SessionManager(testDir);
      const filePath = path.join(testDir, "2025-01-17", "assistant-array.jsonl");
      const result = await mgr.loadSession(filePath);

      const assistantMsgs = result.uiMessages.filter((m) => m.role === "assistant");
      expect(assistantMsgs.length).toBe(1);
      expect(assistantMsgs[0]!.content).toBe('["line1","line2"]');
    });

    it("should preserve all ModelMessage entries in messages array", async () => {
      const mgr = new SessionManager(testDir);
      const filePath = path.join(testDir, "2025-01-16", "tool-session.jsonl");
      const result = await mgr.loadSession(filePath);

      expect(result.messages.length).toBe(4);
      expect(result.messages[0]!.role).toBe("user");
      expect(result.messages[1]!.role).toBe("assistant");
      expect(result.messages[2]!.role).toBe("tool");
      expect(result.messages[3]!.role).toBe("assistant");
    });

    it("should sort tool_calls uiMessages correctly: thinking, tool, assistant", async () => {
      const mgr = new SessionManager(testDir);
      const filePath = path.join(testDir, "2025-01-16", "tool-session.jsonl");
      const result = await mgr.loadSession(filePath);

      const roles = result.uiMessages.map((m) => m.role);
      expect(roles).toEqual(["user", "thinking", "tool", "assistant"]);
    });
  });
});
