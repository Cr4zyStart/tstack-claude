// The system prompt sections the extension sets on every agent start.
import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { sheetCases } from "../session-hook-sheets.mjs";
import { pluginRoot, useWorld } from "./harness.mjs";

// FIX [Claude AI - Opus 5] (2026-10-10 06:52:19): bun defaults to 5 s. A git
// or spawn fixture on Windows routinely needs longer, and a suite whose files
// disagree about the clock produces reds that move between runs.
setDefaultTimeout(30_000);

const mandate = readFileSync(join(pluginRoot, "hooks/session-start-context.md"), "utf8");
const piTools = join(pluginRoot, "skills/solo/references/pi-tools.md");
const always = {
  "tstack-parallel-calls":
    "If you intend to call multiple tools and there are no dependencies between the calls, make all of the independent calls in the same response, otherwise you MUST wait for previous calls to finish first to determine the dependent values.",
  "tstack-pi-tools": `tstack skills are written for Claude Code. When one names a Claude Code tool (Agent, Skill, AskUserQuestion, Bash), a bundled skill, or a Claude model, read ${piTools} for the Pi equivalent before following it.`,
};

const setup = useWorld();

async function sectionsAfterStart(pi, ctx) {
  const event = { prompt: "hi", systemPrompt: "", systemPromptOptions: { sections: {} } };
  await pi.emit("before_agent_start", event, ctx);
  return event.systemPromptOptions.sections;
}

describe("before_agent_start", () => {
  test("injects the mandate when there is no sheet", async () => {
    const { pi, ctx } = setup();
    expect(await sectionsAfterStart(pi, ctx)).toEqual({ ...always, "tstack-session-start": mandate });
  });

  test("injects the mandate and the full sheet on every agent start", async () => {
    const sheet = "arena runners: opus, fable, sonnet\nsession hook: on\n";
    const { pi, ctx } = setup({ sheet });
    for (let i = 0; i < 2; i++) {
      expect(await sectionsAfterStart(pi, ctx)).toEqual({ ...always, "tstack-session-start": mandate, "tstack-models": sheet });
    }
  });

  test("session hook: off drops the mandate but keeps the sheet and the tool mapping pointer", async () => {
    const sheet = "swarm workers: opus\nsession hook: off\n";
    const { pi, ctx } = setup({ sheet });
    expect(await sectionsAfterStart(pi, ctx)).toEqual({ ...always, "tstack-models": sheet });
  });

  for (const { name, sheet, off } of sheetCases) {
    test(`${off ? "drops" : "keeps"} the mandate when the sheet has ${name}`, async () => {
      const { pi, ctx } = setup({ sheet });
      const sections = await sectionsAfterStart(pi, ctx);
      expect(sections["tstack-session-start"]).toBe(off ? undefined : mandate);
    });
  }

  test("a child pi gets the sheet but not the mandate", async () => {
    const sheet = "swarm workers: opus\n";
    const { pi, ctx } = setup({ sheet, settings: { depth: 1 } });
    expect(await sectionsAfterStart(pi, ctx)).toEqual({ ...always, "tstack-models": sheet });
  });

  test("the tool mapping pointer names the installed pi-tools.md, which exists", async () => {
    const { pi, ctx } = setup();
    expect((await sectionsAfterStart(pi, ctx))["tstack-pi-tools"]).toContain(piTools);
    expect(readFileSync(piTools, "utf8")).toContain("# Pi tool mapping");
  });
});
