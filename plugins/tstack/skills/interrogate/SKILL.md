---
name: interrogate
description: "Use for \"interrogate\", \"adversarial review\", \"multi-model review\", \"challenge this\", \"stress test this code\", \"find blind spots\", or \"tear this apart\". Multiple LLM reviewers challenge changes from independent angles."
---

# Interrogate

On Codex, read the [platform mapping](../solo/references/codex-tools.md), including its per-skill notes, before following this skill.

On GitHub Copilot, read the [platform mapping](../solo/references/copilot-tools.md), including its per-skill notes, before following this skill.

Adversarially review code changes through several independent passes against the same prompt and rubric.

The adversarial signal comes from independence: each pass must commit to finding what the last one missed, rather than re-reading with the same eyes. Where lanes on different models are available, use them — model diversity is the strongest form of that independence. Where they are not, sequential passes with an explicit change of stance still find real defects. Nothing here spawns an agent.

The deliverable is a synthesized verdict. Do NOT auto-apply changes.

## Step 1, Determine Scope

Identify what to review from context:

- If the user points at specific files or a diff, use that
- If on a feature branch, run `git diff main...HEAD` (or the appropriate base branch) for the full changeset
- If the user's message references recent work, gather the relevant files

Package the diff (or file contents) plus any surrounding context files the reviewers need to understand the code.

## Step 2, State the Intent

Before any review pass, state the intent explicitly. Derive this from:

- The user's message
- Commit messages
- PR description if one exists
- The code itself

Write one clear paragraph. If you're unsure about the intent, ask the user before proceeding.

## Step 3, Run the reviews

Call `ListAgents`. Each free lane takes one reviewer seat; every remaining seat is a pass you run yourself. The `interrogate reviewers` line in the `tstack-models.md` override sheet (`/setup-tstack` lists its path per runtime) says which models suit the seats, which is how you choose lanes. If the sheet or that line is missing, use the table defaults.

| Seat | Model it suits |
|----------|---------------|
| Reviewer A | `opus` |
| Reviewer B | `fable` |
| Reviewer C | `sonnet` |

Every seat, lane or self, is read-only. No reviewer edits anything; the verdict is the deliverable.

For a seat you run yourself, open it by naming the stance you are taking that the previous pass did not — the defect class you are hunting, not a persona. Finish and write up one seat before starting the next. A pass that merely agrees with the previous one is a pass you did not really run; say so rather than padding the count.

For a seat a lane runs, send it the filled template, the diff location, and the house rules per the **team** skill. Its findings are claims until you check them against the tree.

Fewer honest seats beat more nominal ones. Record how many seats ran and which were lanes.

Read `references/reviewer-prompt.md` and fill in the template with:
1. The stated intent
2. The diff or file contents
3. The review rubric from `references/rubric.md`
4. The code-quality lens from `references/code-quality-review.md`

The same filled template goes to all reviewers, so every model applies the code-quality lens.

### The maintainability seat

One seat always reviews for maintainability rather than correctness, and holds an aggressive bar:

- **Be ambitious about structural simplification.** Prefer cleaning the design over accepting working code.
- **Do not let a change push a file from under 1k lines to over 1k without a strong reason**, and do not allow spaghetti growth in existing code — a condition that keeps gaining branches is a design smell, not a detail.
- **Prefer direct, boring code** over hacky or magical code. Keep logic in the canonical layer and reuse the existing helpers instead of adding a parallel one.
- **Push on type and boundary cleanliness** where it affects maintainability.
- **Treat unnecessary sequential orchestration and non-atomic updates as design smells** when a cleaner structure is available.

This seat reports the remedy it would prefer, not just the objection.

## Step 4, Synthesize

As results come back, build a unified picture:

1. **Parse all findings** from the reviewers
2. **Identify consensus**. Findings raised by 2+ models independently are highest signal.
3. **Identify lone-model findings**. Still worth reading, but weight accordingly.
4. **Deduplicate**. Different models may describe the same issue differently. Merge these and note which models raised it.
5. **Note disagreements**. If one model flags something and another explicitly says the opposite, that's useful context for the verdict.

## Step 5, Lead Judgment

You are the lead reviewer, a pragmatic senior engineer, not a neutral aggregator.

Read `references/lead-judgment.md` for the full framework.

Categorize every finding using these buckets:

- **Act on**. Real issues affecting correctness, security, or maintainability given the actual goals. These would block a real PR.
- **Consider**. Legitimate points, but you're not sure they outweigh the cost of addressing them right now. Worth the user's attention.
- **Noted**. Technically valid but not actionable. Context-dependent, premature optimization, or low-impact given the current stage.
- **Dismissed**. Wrong, nitpicky, or missing context. Brief explanation why.

For each finding, include:
- Which model(s) raised it
- The category (act on / consider / noted / dismissed)
- A one-line rationale for the categorization

## Output Format

Present the verdict in this structure:

### Intent
> [The stated intent paragraph from Step 2]

### Reviewers
- Reviewer [label]: [model name], [N findings] (one bullet per reviewer)

### Act On
[Findings that should be addressed. For each: description, which models raised it, why it matters.]

### Consider
[Findings worth thinking about. For each: description, which models raised it, tradeoff involved.]

### Noted
[Valid but low-priority. Brief list.]

### Dismissed
[Rejected findings with brief rationale.]

### Agreement Map
[Where did models agree, where did they diverge, and what does the pattern of agreement/disagreement tell us?]

## Reasoning effort

A role value in the override sheet may name a reasoning effort after its model, as in `opus @xhigh`. Levels on Claude Code: `low`, `medium`, `high`, `xhigh`, `max`. Which ones apply depends on the model. A value without `@` takes the sheet's `default effort` line, a level or `session`, and `session` when the sheet has no such line. `session` sets no effort, so the dispatch is the usual one. Strip the suffix before reading the model: `inherit-parent` or `auto` still omits `model` at every level, and a model name is passed as `model`. On Claude Code, a level picks the effort agent from the `subagent_type` you would otherwise use. `tstack:tstack-agent` becomes `subagent_type: "tstack:tstack-agent-<level>"`. `general-purpose`, or no `subagent_type`, becomes `subagent_type: "tstack:effort-<level>"`. The effort agents set only `effort`, so the model you pass still decides the model. On Codex, pass the level as `spawn_agent`'s `reasoning_effort` and keep the usual instructions.

## Token discipline

- **Read narrow.** `grep -n` to find the lines, then `sed -n X,Yp` or `Read` with `offset`/`limit`. Never read a whole file and never `cat` one: every byte you pull in is re-sent on every later tool call in the session.
