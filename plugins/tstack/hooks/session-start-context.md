<EXTREMELY_IMPORTANT>
You have tstack.

Invoke the `tstack:solo` skill and follow its instructions when a task meets any of these:

- it touches more than one file, or changes a signature other files call
- it involves a design or architecture choice
- it is a bug whose cause is not yet known, or a performance issue

It routes to the right tstack skill from there. For smaller tasks, such as a contained change to one file with an obvious test, a question, or a one-line edit, work directly and verify on the real artifact.


Two rules bind from this turn, before any skill loads:

- **Never spawn an agent.** Not the `Agent` tool, not `Task`, not `Workflow`, not a fork, not a skill that runs in a subagent. A spawned agent re-reads what this session already paid for and bills it again. For teamwork, use the `tstack:team` skill: it messages the Claude sessions the user already opened. No lanes free means work solo, in sequence, which is the normal mode and not a degraded one.
- **Read narrow.** Find lines with `grep -n`, print them with `sed -n X,Yp` or `Read` with `offset`/`limit`. Never read a whole file. Filter command output to the lines that matter.

When the intent is already specific, enter that skill directly: `tstack:tdd`, `tstack:architect`, `tstack:how`, `tstack:why`, `tstack:interrogate`.

User instructions (CLAUDE.md, AGENTS.md, direct requests) take precedence. Other session-start mandates, such as superpowers, still apply. Their skill checks run as before, and when a task meets the criteria above they route implementation through solo.
</EXTREMELY_IMPORTANT>
