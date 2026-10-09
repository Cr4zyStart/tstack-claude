### Feature

**You own the design. Plan, review, verify.** Delegate implementation. Stay in the lead.

1. `how` over the affected subsystem.
2. `architect` for design exploration: competing shapes, sketched in turn.
3. Write the throughput checkpoint as four todo items. A dimension that genuinely does not apply (single file, no fan-out) keeps its item with `n/a: <reason>` rather than being dropped:
   - **Blocking first steps.** Gates run before any work is split.
   - **Independent workstreams.** Disjoint files, services, or layers parallelize. Shared writes serialize.
   - **Shared mutable state.** Default to splitting the target (the **separate-before-serializing-shared-state** principle skill). Serialize only for real invariants.
   - **Smallest safe decomposition.** If one worker is best, name why.
4. Write the code yourself, or give a well-bounded slice to an open lane per the **team** skill, with a specific scope (file paths, named data shape and its organizing structure per **principle-model-the-domain**, a state machine over scattered booleans, a table/registry over branching, a typed model over repeated shape assumptions, chosen before any logic is written, and success criteria). When the implementation admits multiple valid shapes (error handling, abstraction layer, test structure), run the alternatives yourself, one at a time, then pick a base and graft: run the alternatives one after another yourself and let the cross-judge pass guard the pick. Mandatory: no skip-with-reason escape, and Laziness Protocol does not override it (the gain is review separation, not lines saved). You satisfy it by owning the diff yourself and keeping the same review separation. No "standing by" reply that waits on anything. **Give every file-writing lane its own worktree** (hand it an exclusive branch, or have it run `git worktree add`), and do not write files or run a suite in a worktree a lane still holds. When the lane builds on commits the default branch lacks, commit them, have it create its worktree with `git worktree add <path> -b <lane-branch> HEAD`, and name that base commit in the brief. Fencing a file in the brief's prose is not a lock (**principle-separate-before-serializing-shared-state**). Comments per **Comments**. Surgical edits, re-ground against the source for upstream-derived files. Port shared-primitive improvements to all consumers and verify each. Commit liberally.
5. Verify on the matching surface. "Inconclusive" or wrong-surface is not a pass. Flag it.
6. Rebase into small, ordered commits. Stack follow-ups.
   Use the **sequence-verifiable-units** principle skill, building, verifying, and committing each small unit before the next.
7. If the design is contested, `interrogate` before shipping.
8. Run **Opening a PR**.

Code-coupled work (one feature, one migration) stays with one owner and the checkpoint inline, because splitting coupled code costs more in briefs and merges than it saves. Lane-level split-out is for slices that produce independent artifacts (audits, cross-subsystem investigations, competing experiments). Rewrite the checkpoint at phase boundaries. Hand the next phase to a fresh owner with consolidated scope rather than chaining interrupts onto the last one.

**Reply:** what you built, what you chose and why, the throughput checkpoint, open decisions. Tables for design alternatives.
