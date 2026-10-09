---
name: team-nv
description: Lane teamwork with verification skipped, for fast parallel prototyping and read-only fan-out. Read the team skill, then drop the real-artifact proof pass and declare what went unproven. Use for /team-nv, "split this across the tabs, rough is fine", or parallel exploration.
---

# Team, no verification

Read [`team`](../team/SKILL.md) in full and follow its Protocol. Then apply the trade in [`solo-nv`](../solo-nv/SKILL.md), including its `Unverified:` block.

Best fit is read-only fan-out, where there is no artifact to drive in the first place: searches across a tree, evidence gathering, three unrelated questions, competing rough sketches.

## What this drops

The artifact proof pass, exactly as in [solo-nv](../solo-nv/SKILL.md#what-this-drops). No driver skill, no independent verdict.

## What it keeps

Everything under [solo-nv's keeps](../solo-nv/SKILL.md#what-it-keeps), plus the two that only matter once another session is involved:

- **Step 5 of the Protocol still applies.** Check a lane's claims against the tree before you repeat them. This is not artifact verification — it is not believing a report you never read. Drop it and `-nv` becomes "print whatever the tabs said", which is worse than working alone.
- **One writer per file.** Even for a prototype. Two lanes editing one file lose work, and lost work is not a speed trade, it is a redo.

In the `Unverified:` block, mark which claims came from a lane and which you read yourself.

## No lanes free

Per [team's Falling back](../team/SKILL.md#falling-back), work the units yourself in sequence — that is [`solo-nv`](../solo-nv/SKILL.md), and it is the normal mode, not a degraded one. On Codex and Pi there are no lanes at all, so this always resolves to `solo-nv` there.

Never ask the user to open tabs so you can have a team.
