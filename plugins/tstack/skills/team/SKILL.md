---
name: team
description: Team mode without spawning anything. Find the Claude sessions the user already opened, give one a brief, wake it, and collect its answer. Use for "work with the other tab", "split this across lanes", "ask the other session", /team, or any teamwork request.
---

# Team

On Codex, read the [platform mapping](../solo/references/codex-tools.md), including its per-skill notes, before following this skill.

On GitHub Copilot, read the [platform mapping](../solo/references/copilot-tools.md), including its per-skill notes, before following this skill.

Teamwork across sessions the user already opened. No agent is ever created.

A **lane** is another Claude session on this machine: a second tab in the desktop app, a second window, a terminal session, usually a fork of the same project. The user made it. It is already burning its own context whether you talk to it or not, so a message to a lane costs a message. A spawned agent costs a whole new context that re-reads what you already read.

## When this is worth it

Use a lane when **all** of these hold:

- The work splits into parts that do not need each other's intermediate state.
- Each part is worth more than the brief it takes to explain it. Three files to grep is not.
- A lane exists and is free. `ListAgents` tells you; a guess does not.

Otherwise work solo, in sequence. Sequential is the default and it is not a lesser mode — it is the same work at the same quality, trading wall-clock for tokens, which is the trade tstack exists to make.

Never ask the user to open tabs so you can have a team. If more hands would genuinely help, say what you would give each one and let the user decide whether to open them.

## Protocol

**1. Look.** `ListAgents`. Note each lane's name exactly as the row prints it — the name is the address. Nothing else identifies a lane.

**2. Claim.** State out loud which lane gets which part, and in which files. Two lanes editing the same file is a merge conflict you created on purpose.

**3. Brief.** `SendMessage` to one lane by name. A brief is:

- the **one question** it must answer, or the one change it must make
- **where to look**: paths with line ranges, never pasted file contents
- the **shape of the reply**: what you need back and how long it should be
- the **house rules**, because the lane may not have tstack loaded:
  `Do not spawn agents. Read narrow: grep -n to find lines, sed -n X,Yp to print them. Report back when done.`

**4. Keep working.** A lane is not a blocking call. Do your own part while it works. Do not poll it, and never invent what it is going to say — if the user asks before the reply lands, say it is still out.

**5. Own the answer.** Read what comes back, check its claims against the tree, and write your own summary. Do not pass a lane's words through as if they were yours or as if they were verified. A lane that disagrees with you is worth more than one that agrees.

## Briefs

A good brief fits on a screen:

```
Check whether tstack/skills/*/SKILL.md still reference the Agent tool.
Look: plugins/tstack/skills, grep -rn "Agent tool\|subagent_type" --include=SKILL.md
Send back: the file:line of each real hit, and nothing else. No fixes.
Rules: do not spawn agents, read narrow (grep -n then sed -n X,Yp).
```

What makes it good: one question, a search instead of a file list, a bounded reply, the rules restated. A brief that needs a page means the split is wrong — fold it back into your own work.

## What this is not

- **Not fan-out.** You are not creating workers; you are talking to sessions a human opened. If no one is there, you do the work.
- **Not delegation of judgment.** A lane gathers evidence or makes a contained change. The call stays yours.
- **Not a way around reading.** "Have a lane read it for me" is the same tokens in someone else's window, plus a brief and a reply. Read it yourself.

## Falling back

No lanes, all busy, or `ListAgents` unavailable → run the parts yourself in sequence and say that is what you did. Every tstack skill that mentions lanes works this way: lanes are an optimization on a sequential plan, never a requirement. A skill that cannot run without lanes is a bug in the skill.
