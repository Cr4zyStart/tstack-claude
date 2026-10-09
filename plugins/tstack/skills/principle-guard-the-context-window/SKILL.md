---
name: principle-guard-the-context-window
description: "Apply when context is filling up: large outputs, long files, repeated reads. Filter bulk at the source and keep pointers, not raw payloads — every byte read is re-sent on every later call."
user-invocable: false
---

# Guard the Context Window

The context window is finite and non-renewable within a session. Every token should be worth its cost.

**Why:** Every tool call re-sends the whole conversation, so a careless read is not paid once — it is paid again on every step that follows it. A single large file pulled in early can cost more than the rest of the task combined, and a weekly budget dies in an afternoon that way. Overflow also degrades reasoning quality, creates compression artifacts, and halts progress.

**Pattern:**
- **Never pull a large payload in.** Verbose output, screenshots, and long documents do not belong in the context at all: filter command output to the lines that matter, `grep -n` a document and print only the hit range, and keep a path as a pointer you can re-open. There is no second context to hide bulk in — every byte you read here is re-sent on every later call.
- **Keep frequently used content inline.** Templates and references used on every invocation belong in the skill file, not in separate files that cost a read each time.
- **Size phases and cap scope.** Limit files per phase, set turn budgets, account for mechanism costs.

**The four mechanics, concretely:**

- **Reading.** `grep -n` to find the lines, then `sed -n X,Yp` or `Read` with `offset`/`limit` to print them. Never read a whole file, never `cat` one.
- **Command output.** Filter to the lines that decide something — for tests, the pass/fail summary. A failing assertion that dumps a fixture poisons the rest of the session.
- **Scripts.** Write a patch or helper script to a file and run the file. Long inline shell is re-sent on every retry, and quoting failures make retries likely.
- **Browser.** Check it when the user asks, or once at the end of a step. Not between edits.

There is no escape hatch here. Routing bulk to a subagent does not avoid the cost, it duplicates it, which is why tstack does not spawn — see solo's [Lanes](../solo/SKILL.md) section.
