import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root), "utf8");

test("CLAUDE.md imports the canonical AGENTS.md", () => {
  assert.match(read("CLAUDE.md"), /^@AGENTS\.md/);
});

test("every role in AGENTS.md has an agent file and a skill", () => {
  const agents = read("AGENTS.md");
  for (const [role, skill] of [["panel-builder", "add-panel"], ["visual-adapter", "retheme"], ["connection-adapter", "connect-assistant"]]) {
    assert.ok(agents.includes(role) && agents.includes(skill), role);
    assert.ok(existsSync(new URL(`.claude/agents/${role}.md`, root)), `${role} agent missing`);
    assert.ok(existsSync(new URL(`.claude/skills/${skill}/SKILL.md`, root)), `${skill} skill missing`);
  }
  for (const skill of ["setup", "run-checks"]) assert.ok(existsSync(new URL(`.claude/skills/${skill}/SKILL.md`, root)), skill);
});

test("sub-agents have no web tools and cannot spawn agents", () => {
  for (const file of readdirSync(new URL(".claude/agents/", root))) {
    const tools = read(`.claude/agents/${file}`).match(/^tools:(.*)$/m)?.[1] ?? "";
    assert.ok(tools.trim(), `${file} declares no tool list`);
    for (const banned of ["WebFetch", "WebSearch", "Agent", "Task"]) assert.ok(!tools.includes(banned), `${file}: ${banned}`);
  }
});

test("project permissions block web, secret files, env dumps, installs and push", () => {
  const deny: string[] = JSON.parse(read(".claude/settings.json")).permissions.deny;
  for (const rule of ["WebFetch", "WebSearch", "Read(./.env)", "Read(./.env.local)", "Read(./.env.*.local)", "Bash(env)", "Bash(printenv:*)", "Bash(npm install:*)", "Bash(npx:*)", "Bash(git push:*)"]) {
    assert.ok(deny.includes(rule), rule);
  }
});

test("the skill mirror for Codex is identical to the canonical skills", async () => {
  const { differences } = await import("../scripts/sync-skills.mjs");
  assert.deepEqual(differences(), []);
});

test("the mirror script refuses symlinks", { skip: process.platform === "win32" && "symlinks need admin rights on Windows" }, async () => {
  const { listFiles } = await import("../scripts/sync-skills.mjs");
  const dir = mkdtempSync(join(tmpdir(), "kit-"));
  try {
    symlinkSync(tmpdir(), join(dir, "escape"));
    assert.throws(() => listFiles(dir), /symlink|outside/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("secrets stay out of the repository", () => {
  const ignore = read(".gitignore");
  for (const rule of [".env*", "!.env.example", ".next/", "node_modules/"]) assert.ok(ignore.includes(rule), rule);
  for (const line of read(".env.example").split(/\r?\n/).filter((l) => /^ASSISTANT_(API_KEY|ACCESS_CODE)=/.test(l))) {
    assert.match(line, /=$/, `.env.example holds a value for a secret: ${line.split("=")[0]}`);
  }
});
