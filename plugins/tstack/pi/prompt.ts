import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { readSheet, type Settings } from "./config.ts";

const MANDATE_SECTION = "tstack-session-start";
const SHEET_SECTION = "tstack-models";
const PARALLEL_SECTION = "tstack-parallel-calls";
const TOOLS_SECTION = "tstack-pi-tools";

// tstack skills name Claude Code tools and models. A session with the hook off,
// a child agent, or a skill invoked directly may never see the pointer in
// solo/SKILL.md, so every session gets it here.
function piToolsNote(pluginRoot: string): string {
  const file = join(pluginRoot, "skills", "solo", "references", "pi-tools.md");
  return `tstack skills are written for Claude Code. When one names a Claude Code tool (Agent, Skill, AskUserQuestion, Bash), a bundled skill, or a Claude model, read ${file} for the Pi equivalent before following it.`;
}
// Claude Code's system prompt, word for word but for its function_calls block.
// tstack skills that say "one message, N Agent calls" rely on it.
const PARALLEL_CALLS =
  "If you intend to call multiple tools and there are no dependencies between the calls, make all of the independent calls in the same response, otherwise you MUST wait for previous calls to finish first to determine the dependent values.";

// Claude Code runs the session hook and loads the sheet through a CLAUDE.md
// include; Pi has neither, so both ride as system prompt sections, set again
// on every agent start so compaction cannot drop them.
// A child gets the sheet, as a Claude Code subagent sees CLAUDE.md, but not
// the mandate. tstack registers no agent tool, so nothing below depth 0 exists.
export function registerPromptSections(pi: ExtensionAPI, settings: Settings): void {
  const mandateFile = join(settings.pluginRoot, "hooks", "session-start-context.md");
  pi.on("before_agent_start", (event) => {
    const sheet = readSheet(settings.agentDir);
    const sections = event.systemPromptOptions.sections;
    sections[PARALLEL_SECTION] = PARALLEL_CALLS;
    sections[TOOLS_SECTION] = piToolsNote(settings.pluginRoot);
    if (settings.depth === 0 && !sheet?.hookOff) sections[MANDATE_SECTION] = readFileSync(mandateFile, "utf8");
    if (sheet) sections[SHEET_SECTION] = sheet.text;
  });
}
