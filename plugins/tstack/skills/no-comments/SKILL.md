---
name: no-comments
description: "Run the comment-sicko review over the scope, fix accepted findings, and offer encodings for claimed constraints. Never spawns an agent."
---

# No comments

On Codex, read the [platform mapping](../solo/references/codex-tools.md), including its per-skill notes, before following this skill.

On GitHub Copilot, read the [platform mapping](../solo/references/copilot-tools.md), including its per-skill notes, before following this skill.

Run the comment-sicko review. Act on accepted findings.

Defer to comment-sicko's stance over your own attachment to what you wrote. Nothing spawns, so there is no second pair of eyes to borrow: you supply the distance by applying the document against your own instinct.

## Scope

Use the caller's files or diff. Otherwise use the current diff against the base branch, default `main`, including the working tree.

## Steps

1. Read [`../solo/references/agents/comment-sicko.md`](../solo/references/agents/comment-sicko.md) and apply it to the scope yourself, producing its report and diff. Hand it to a free lane instead when one exists, per the **team** skill: point the lane at that file and the scope, and do not restate its rules. Either way step 2 audits the result, including when you produced it — judging your own pass needs the same suspicion you would bring to someone else's.
2. Inspect its report and diff. Reject application-code edits, scope escapes, exception-protected deletions, misstated `MUST KILL` reasons, and flags that treat kept intentional code as guilty. Reshape flags on our-code surprises stay actionable. Do not restore those comments. A keep survives only with proof it is about something we cannot change. Audit missed scoped lint and TypeScript suppressions. Correctness or safety suppressions stay actionable `MUST KILL`s. Restore deletions only with exact exceptions and scoped proof. Before accepting thin `IMPORTANT` or `do not remove` kills or keeps, run `/how` or `/why` on their symbol. If a kill is ambiguous, do not restore. If a keep is refuted or still ambiguous, delete it. Revert and rerun one rejected report with the failure named. Reject a second, report it open, and fail `/no-comments`.
3. Fix trivial accepted flags directly by deleting a dead path, dropping a parameter, or using the real API. If any fix needs a shape, run `/architect` once for the accepted set and surrounding code. Stop at the sketch. Architect shapes. Step 4 implements.
4. Implement the smallest root-cause fix in scope. Remove every named workaround. If the root cause is out of scope, land the smallest in-scope fix and report the rest open. The **principle-fix-root-causes** and **principle-redesign-from-first-principles** skills guide intent only. Neither authorizes widening the fence nor fixing instances outside it. Never bolt on symptom guards.
5. Constraint comments say `do not remove`, `do not change wording`, or `talk to X before changing`. Leave keeps about things we cannot change. Offer the cheapest in-scope type, runtime, test, or CI lint. Wait for interactive approval. Unattended and eval require caller pre-approval. If approved, encode then delete. Otherwise delete, report the constraint open, and sketch out-of-scope work.
6. Report the deletion count, restored comments, reruns, architect sketch, fixes, encoding offers, encodings, unenforced constraints, and other open work.

## Token discipline

- **Read narrow.** `grep -n` to find the lines, then `sed -n X,Yp` or `Read` with `offset`/`limit`. Never read a whole file and never `cat` one: every byte you pull in is re-sent on every later tool call in the session.
