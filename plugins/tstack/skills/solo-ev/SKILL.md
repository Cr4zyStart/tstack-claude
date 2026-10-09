---
name: solo-ev
description: Solo work with verification enforced. Read the solo skill, then prove every claim on the real artifact before declaring done. Use for /solo-ev, "verify it properly", "prove it works", or any change a user will touch.
---

# Solo, verification enforced

Read [`solo`](../solo/SKILL.md) in full, including its inline Principles index, and work under it. This file only says what changes.

Nothing here is new policy. It removes the judgment call about *whether* this task needs proof: it does.

## What this enforces

1. **Drive the real artifact.** Resolve the driver skill through [solo's Non-negotiables](../solo/SKILL.md#non-negotiables): the project `verify` skill at `.claude/skills/verify/`, `run` when the repo has none, and `/create-verification-skill` first when the work is UI and the repo has no harness at all. "It compiles", "the types pass", and a green suite are not the artifact.
2. **Reproduce before you fix.** For a bug, show the failure on the same surface the user sees, before the change. A fix with no before-state is a guess that happened to pass.
3. **Show the observed output.** The real line, value, exit code, or screenshot path — not a description of it.
4. **Prove absence when absence is the claim.** "It no longer leaks" needs the measurement. Nobody complaining is not evidence.

Read [`principle-prove-it-works`](../principle-prove-it-works/SKILL.md) this session before you declare done, and cite it.

## The independent verdict

When the work needs a second opinion — irreversible, security-touching, or you wrote both the code and the test that blesses it — **it cannot come from you.** Per [solo's Lanes section](../solo/SKILL.md#lanes--never-subagents), never count your own review, passing tests, or CI as the independent verdict. The reviewer is a free lane or the user.

This is the one requirement that does not degrade into a pass you run yourself. No free lane and no user to ask → record `BLOCKED: independent review` in the todolist and stop there rather than shipping on your own word.

Lanes make a reviewer available: [`team-ev`](../team-ev/SKILL.md) is this skill with that option open.

## Done means

A reply that names the artifact, the command or flow you drove, and what you observed. If you could not drive it, say so plainly instead of softening the claim — an unproven change reported as proven is the exact failure this skill exists to prevent.
