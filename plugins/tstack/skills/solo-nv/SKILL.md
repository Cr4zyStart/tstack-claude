---
name: solo-nv
description: Solo work with verification skipped, for fast prototyping and throwaway spikes. Read the solo skill, then drop the real-artifact proof pass and declare what went unproven. Use for /solo-nv, "prototype this", "quick spike, don't verify", or when a rough answer now beats a proven one later.
---

# Solo, no verification

Read [`solo`](../solo/SKILL.md) in full, including its inline Principles index, and work under it. This file only says what changes.

You are trading proof for speed. That is the whole point, and it is only a trade when you say out loud what went unproven.

## What this drops

- **No driver skill.** Don't launch the app, don't drive the UI or CLI, don't write a verification skill. The driver trigger in [solo's Non-negotiables](../solo/SKILL.md#non-negotiables) is off for this run.
- **No independent verdict.** You are not asking a lane or the user to review.
- **No test-first detour.** Run a cheap test that already exists; don't write one.

## What it keeps

None of these are verification, and all of them stay:

- **Never spawn an agent.** Non-negotiable in every mode, and the rule tstack exists for.
- **Read narrow.** `grep -n` to find lines, `sed -n X,Yp` or `Read` with `offset`/`limit` to print them. A prototype is not a reason to read whole files.
- **Cite the principles that shaped a decision**, per solo's Principles index.
- **Say what you actually did.** A prototype is allowed to be unproven. It is not allowed to be described as working.

## Declare the gap

End every reply with an `Unverified:` block — one line per claim you did not prove, and the cheapest way to prove it:

```
Unverified:
- the rate cap actually rejects the 61st call — run `bun test rate.test.mjs`
- the panel renders at mobile width — needs /solo-ev or a browser pass
```

An empty list is not allowed. If nothing is unproven you ran verification, so you were in the wrong skill: say so, and work under [`solo-ev`](../solo-ev/SKILL.md).

## When to refuse this skill

Say which skill you are switching to and why **before** doing the work, when the task is:

- a bug whose cause is not yet known — a guess you cannot check is not a fix
- anything a user will touch in this state
- money, auth, permissions, migrations, or deletes

Choosing this skill is a decision about throwaway code. It is not a decision to ship unproven work.
