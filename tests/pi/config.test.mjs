// The settings the extension derives from its flags, environment, and model sheet.
import { expect, setDefaultTimeout, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

import { defaultSettings, loadAgentTypes, readSheet } from "../../plugins/tstack/pi/config.ts";
import { chmodDeniesReads } from "../session-hook-sheets.mjs";

// FIX [Claude AI - Opus 5] (2026-10-10 06:52:19): bun defaults to 5 s. A git
// or spawn fixture on Windows routinely needs longer, and a suite whose files
// disagree about the clock produces reds that move between runs.
setDefaultTimeout(30_000);

test("depth comes from the reader on each use and PI_CODING_AGENT_DIR moves the sheet", () => {
  let flag = 0;
  const settings = defaultSettings(() => flag, { PI_CODING_AGENT_DIR: "/tmp/pi-agent-x", HOME: "/nowhere" });
  expect(settings.depth).toBe(0);
  flag = 2;
  expect(settings.depth).toBe(2);
  expect(settings.agentDir).toBe("/tmp/pi-agent-x");
  expect(defaultSettings(() => 0, {}).agentDir).toBe(join(homedir(), ".pi", "agent"));
});

test("an agent file's effort is checked against the efforts list in models.json", () => {
  const root = mkdtempSync(join(tmpdir(), "tstack-agents-"));
  try {
    const models = { available: [], efforts: ["low"], pi: { fallback: "anthropic", models: {} } };
    writeFileSync(join(root, "models.json"), JSON.stringify(models));
    mkdirSync(join(root, "agents"));
    writeFileSync(join(root, "agents", "slow.md"), "---\neffort: low\n---\nbody\n");
    const settings = { pluginRoot: root, modelsFile: join(root, "models.json") };
    expect(loadAgentTypes(settings).get("tstack:slow")).toEqual({ body: "body", model: undefined, effort: "low" });
    writeFileSync(join(root, "agents", "slow.md"), "---\neffort: medium\n---\nbody\n");
    expect(() => loadAgentTypes(settings)).toThrow('tstack:slow: effort "medium" is not one of low');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test.skipIf(!chmodDeniesReads)("a sheet in a directory that cannot be searched reads as absent until it can", () => {
  const dir = mkdtempSync(join(tmpdir(), "tstack-sheet-"));
  try {
    writeFileSync(join(dir, "tstack-models.md"), "session hook: off\n");
    chmodSync(dir, 0o000);
    expect(readSheet(dir)).toBeUndefined();
    chmodSync(dir, 0o700);
    expect(readSheet(dir)).toMatchObject({ hookOff: true });
  } finally {
    chmodSync(dir, 0o700);
    rmSync(dir, { recursive: true, force: true });
  }
});
