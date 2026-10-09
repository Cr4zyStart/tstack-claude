---
name: team-ev
description: Lane teamwork with verification enforced, including an independent verdict from a free lane. Read the team skill, then prove every claim on the real artifact before declaring done. Use for /team-ev, "split this and verify it properly", or shipping work across sessions.
---

# Team, verification enforced

Read [`team`](../team/SKILL.md) in full and follow its Protocol. Then apply every requirement in [`solo-ev`](../solo-ev/SKILL.md).

This is the only shape where the independent verdict has somewhere to come from, which is most of why it exists.

## The verdict has a home here

Claim one free lane as the reviewer and keep it out of the writing. Per [solo's Lanes section](../solo/SKILL.md#lanes--never-subagents), you cannot be your own second opinion, and that requirement does not degrade.

Brief the reviewer like any other lane — one question, paths with line ranges, the shape of the reply, the house rules verbatim — and give it the diff's location rather than the diff. Ask for a verdict and the evidence behind it, not an opinion.

If every lane is busy and the user is unavailable, record `BLOCKED: independent review` in the todolist. Do not promote your own pass into the verdict.

## Writers need isolation

One writer per file, and every file-writing lane gets its own worktree:

```
git worktree add <path> -b <lane-branch> HEAD
```

Name the base commit in the brief. Never write to, or run a suite in, a worktree a lane still holds — you will race its working tree, and then both of you debug the collision instead of the code.

## Verify once, on one tree

Lanes prove their own slice; you prove the assembled result. A slice that passed in isolation is not evidence that the merge works. Drive the real artifact yourself after the branches come together, per [solo-ev](../solo-ev/SKILL.md#what-this-enforces).

## No lanes free

Per [team's Falling back](../team/SKILL.md#falling-back), work the units in sequence — that is [`solo-ev`](../solo-ev/SKILL.md). The verification requirement survives the fallback. The independent verdict falls to the user, and blocks when they are unavailable. On Codex and Pi there are no lanes, so that is always the case there.
