---
name: how
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, onboarding mental models. Use why for motivation."
---

# How

On Codex, read the [platform mapping](../solo/references/codex-tools.md), including its per-skill notes, before following this skill.

On GitHub Copilot, read the [platform mapping](../solo/references/copilot-tools.md), including its per-skill notes, before following this skill.

Explore the codebase to answer "how does X work?" questions. Produce architectural explanations at the level of a senior engineer onboarding onto a subsystem, enough to build a working mental model, not so much that it reads like annotated source code.

**You do every pass yourself.** Nothing here spawns an agent. The role lines in `tstack-models.md` say which model each pass *suits*, which matters only when you hand a pass to a lane per the **team** skill. Working the passes in sequence on your own model is the normal case.

Read narrow throughout: `grep -n` to locate, `sed -n X,Yp` to print. An exploration that reads whole files costs more than the answer is worth.

## Step 1. Assess Complexity

If the scope is ambiguous, state your interpretation and explore. The user can redirect.

- **Simple** (a single module, a small utility, a narrow question such as "how does function X work"): no explorers. One explainer explores and explains in a single pass. Go to Step 2b.
- **Complex** (a subsystem spanning multiple files or services, a cross-cutting feature, a full architectural overview): work the exploration angles first, then write the explanation. Go to Step 2a.

When in doubt, take the simple path.

## Step 2a. Explore (complex questions only)

Decompose the question into 2 to 4 exploration angles, each a distinct slice of the subsystem. Work one angle at a time, finishing and noting its findings before starting the next, so the angles stay genuinely separate.

Use `references/explorer-prompt.md` as your checklist for each angle, with that angle filled in. Keep each angle's notes to the file:line evidence and what it means — not the code you read.

If lanes are open and the angles are substantial, hand some out per the **team** skill. Give each lane its angle, the prompt file to follow, and the house rules. Carry on with your own angles meanwhile. Then go to Step 3.

## Step 2b. Direct Explain (simple questions)

Explore and explain in one pass yourself. Follow `references/explainer-prompt.md`, skipping its explorer-findings section. Go to Step 4.

## Step 3. Synthesize (complex questions only)

Once every angle is covered, synthesize the findings into one explanation yourself. Follow `references/explainer-prompt.md` with every angle's findings filled in.

Findings from a lane are evidence, not conclusions. Check their file:line claims against the tree before building on them.

## Step 4. Present

Present the explainer's output to the user. Light edits for clarity or context from the conversation are fine. Do not substantially rewrite it.

## Output Format

The explanation uses the sections defined in `references/explainer-prompt.md`, dropping any that do not apply: Overview, Key Concepts, How It Works, Where Things Live, Gotchas.

## Models

Role defaults, stamped from `plugins/tstack/models.json` (edit there, rerun `tools/generate.mjs`). A matching role line in the `tstack-models.md` override sheet overrides each at runtime; `/setup-tstack` writes it and lists its path per runtime.

- how explorer: `opus`
- how explainer: `opus`

## Reasoning effort

A role value in the override sheet may name a reasoning effort after its model, as in `opus @xhigh`. Levels on Claude Code: `low`, `medium`, `high`, `xhigh`, `max`. Which ones apply depends on the model. A value without `@` takes the sheet's `default effort` line, a level or `session`, and `session` when the sheet has no such line. `session` sets no effort, so the dispatch is the usual one. Strip the suffix before reading the model: `inherit-parent` or `auto` still omits `model` at every level, and a model name is passed as `model`. On Claude Code, a level picks the effort agent from the `subagent_type` you would otherwise use. `tstack:tstack-agent` becomes `subagent_type: "tstack:tstack-agent-<level>"`. `general-purpose`, or no `subagent_type`, becomes `subagent_type: "tstack:effort-<level>"`. The effort agents set only `effort`, so the model you pass still decides the model. On Codex, pass the level as `spawn_agent`'s `reasoning_effort` and keep the usual instructions.

## Token discipline

- **Read narrow.** `grep -n` to find the lines, then `sed -n X,Yp` or `Read` with `offset`/`limit`. Never read a whole file and never `cat` one: every byte you pull in is re-sent on every later tool call in the session.
