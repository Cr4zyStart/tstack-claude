---
name: tstack-help
description: Guides users through tstack setup, /solo, and picking the skill, playbook, or principle for a task. Type /tstack-help with a question.
---

# Tstack help

Answer the user's question about tstack, hand them a prompt they can send, and link the file the answer came from. For a help question, don't start the work. The user asked how, and a tstack run spends real tokens, so let them send the prompt.

A message that asks for work, such as "use tstack to fix this bug", is not a help question. Read [`solo`](../solo/SKILL.md) and do the work under it.

This file maps questions to the installed skills, playbooks, and platform mappings that own the answers. Read the matching source before answering. Its instructions take precedence over this map and any upstream guide, which describes Cursor and may differ from this port. The local links point into the installed plugin, so give the user the file's public copy: `https://github.com/Cr4zyStart/tstack-claude/blob/main/plugins/pstack/` followed by its path relative to the plugin root.

## Find out what they need

Infer the need from the message and the conversation. A named situation, such as "which skill reviews a PR?", goes straight to its section. If the need is still unclear, ask one multiple-choice question with these options, then answer only the section they pick:

- Get set up
- Start a task with `/solo`
- Pick a skill for a situation
- Fix a run that went wrong
- Make tstack my own
- See every command

Check the state that changes the answer, and mention it only when it does:

- For model or routing questions, identify the runtime and installation type, then read [`setup-tstack`](../setup-tstack/SKILL.md#other-runtimes) for the sheet's location and how that runtime loads it. Check that configuration before saying whether defaults or overrides apply.
- No project `verify` or `verify-*` skill or other app harness means agents have no scripted way to drive the app. Mention `/create-verification-skill` when the question is about proving a change works.

## Get set up

1. Identify the user's runtime and whether they want a native plugin/package or skills-only installation. Read its section in the [README](https://github.com/Cr4zyStart/tstack-claude/blob/main/README.md#install) or [shared installation reference](https://github.com/Cr4zyStart/tstack-claude/blob/main/docs/reference.md#shared-skills-installation), then give the matching install command.
2. Read [`/setup-tstack`](../setup-tstack/SKILL.md), including its Other runtimes table, before explaining model choices, effort, sheet loading, or automatic routing. For a bundled routing hook or extension, use its persistent `session hook: off` setting in the current runtime's sheet to turn routing off.
3. Offer a first task prompt with a goal and a check that can pass or fail, per [`references/prompting.md`](references/prompting.md). Use the current runtime's invocation syntax from the [slash-command reference](https://github.com/Cr4zyStart/tstack-claude/blob/main/docs/reference.md#slash-commands).

Before giving runtime-specific instructions or adapting a recipe, read the [Codex mapping](../solo/references/codex-tools.md) or [Pi mapping](../solo/references/pi-tools.md) when applicable. Their routing sections cover hook trust, extension loading, and skills-only installs. For other runtimes, use the [runtime support reference](https://github.com/Cr4zyStart/tstack-claude/blob/main/docs/reference.md#runtime-support).

If cost is the worry, say where the tokens go and how to spend less. tstack spends extra tokens on subagents and review panels. Rerun `/setup-tstack` and pick a lower effort or cheaper models. A role set to `auto` or `inherit-parent` runs on the chat's model, which costs less when the chat runs on a cheaper model. A shorter panel list runs fewer subagents, one for each entry. Save `/solo` for work that needs rigor.

## Start a task with `/solo`

`/solo` matches the task to a playbook, copies the playbook's steps into the todo list, and runs the other skills as the steps need them. A step it skips stays in the list as `skip: <reason>`. A good prompt states the goal and how to tell it's done. It doesn't list skills, because a hand-written sequence tends to drop or reorder steps the playbook would keep. Read [`references/prompting.md`](references/prompting.md) before you help word one.

For whether later tasks route automatically, use the setup and runtime sources under [Get set up](#get-set-up). Check that routing is enabled for this installation before promising it. Without automatic routing, invoke `solo` for each new task. Mid-chat, "new task" makes the mode match a fresh playbook. For subagent defaults, read [solo's Lanes section](../solo/SKILL.md#lanes--never-subagents) and the current runtime's mapping.

## Pick a skill

The default answer is `/solo`, which runs most of the others when its steps need them. Name a skill directly when the user wants more or less of something than the playbook gives. Read the skill before you recommend it, and give one example prompt.

| The user wants to | Skill |
|---|---|
| Do any non-trivial task with rigor | [`/solo`](../solo/SKILL.md) |
| Hand a unit of work to a session they already have open | [`/team`](../team/SKILL.md) |
| Prototype fast and accept unproven work | [`/solo-nv`](../solo-nv/SKILL.md) |
| Prove a change on the real artifact before it ships | [`/solo-ev`](../solo-ev/SKILL.md) |
| Split a rough exploration across open sessions | [`/team-nv`](../team-nv/SKILL.md) |
| Split shipping work across sessions and have a lane review it | [`/team-ev`](../team-ev/SKILL.md) |
| Know how code works now, or where new code should live | [`/how`](../how/SKILL.md) |
| Know why code is shaped this way, or where a number came from | [`/why`](../why/SKILL.md) |
| Know what a small diff could break outside itself | [`/blast-radius`](../blast-radius/SKILL.md) |
| Settle types and module shape before code that crosses a function boundary | [`/architect`](../architect/SKILL.md) |
| Have several models review a diff and try to break it | [`/interrogate`](../interrogate/SKILL.md) |
| Fix a bug test-first when a cheap local test exists | [`/tdd`](../tdd/SKILL.md) |
| Strip comments before review, using a reviewer that didn't write them | [`/no-comments`](../no-comments/SKILL.md) |
| Clean AI tells out of prose | [`/unslop`](../unslop/SKILL.md) |
| Write docs, an RFC, a README, a PR description, or a commit message to a standard | [`/technical-writing`](../technical-writing/SKILL.md) |
| Give agents a scripted way to drive the app and prove behavior | [`/create-verification-skill`](../create-verification-skill/SKILL.md) |
| Pick a model for each role and a default effort | [`/setup-tstack`](../setup-tstack/SKILL.md) |
| Stop agents from repeating the same mistakes in this repo | [`/correct`](../correct/SKILL.md) |
| Find their way around tstack | `/tstack-help` |

If a skill directory next to this one is missing from the table, read its frontmatter and route by its description. The `principle-*` directories are covered under principles below.

Close calls:

- `/how` explains what the code does. `/why` explains the reasons. Ask either one to explain plainly and it will.
- `/architect` implements right after it settles the design. Add "with checkpoint" to review the design before it writes code.
- `/interrogate` reviews the diff. `/blast-radius` looks for breakage outside the diff and proves the one fact that makes the change safe.
- Resuming a specific chat or branch is the Session pickup playbook.
- The Orchestrate playbook runs a program that spans days and many PRs. The Autonomous run playbook drives one task to a finish condition.

Not in tstack:

- The Cursor driver skills have no port. The driver policy in solo's Non-negotiables names the Claude Code equivalents, the `run` skill and a project `verify` skill.
- `/loop` is a Claude Code bundled skill, and the **plugin-dev:skill-development** skill is Claude Code's skill-authoring guidance.
- tstack has no orchestrate skill. Orchestrate is a `/solo` playbook. If the slash menu shows an orchestrate command, another plugin provides it.

## Show every command

For "what can tstack do", "show me every command", or a bare `/tstack-help` with no question, print the whole list. Build it from the tree rather than from memory, so it cannot drift: list the skill directories beside this one, drop the `principle-*` leaves, and read each remaining `SKILL.md` frontmatter for its name and the first clause of its description.

Lead with the six entry points, because every other command is something they call:

| command | shape |
|---|---|
| `/solo` | one session does the work; verification is a judgment call |
| `/solo-nv` | same, verification skipped, for prototypes |
| `/solo-ev` | same, verification enforced on the real artifact |
| `/team` | work split across sessions the user already opened |
| `/team-nv` | same, verification skipped |
| `/team-ev` | same, verification enforced, with a lane giving the independent verdict |

Then group the rest under the headings of the table above — understand, build, review, ship, configure — one line each. Say that the `principle-*` leaves exist and are read by `/solo` rather than invoked. Don't paste descriptions verbatim; a short clause each is enough.

## Playbooks and principles

Playbooks are step lists inside `/solo`, not skills, so they have no slash command. Inside `/solo`, describing the task picks one, and these phrases name one directly:

- "babysit this pr" or "check on pr 123" runs Babysit. It drives the PR to merge-ready and stops there. It doesn't merge unless the user asks to merge, land, or ship.
- "land the stack" runs Shipping.
- "take over this branch" runs Session pickup.
- "pause safely" runs Pause safely.
- "full autopilot on this queue" runs [Autopilot-full](../solo/playbooks/autopilot-full.md). "stack them, don't ship" runs [Autopilot-stack](../solo/playbooks/autopilot-stack.md). Read the selected playbook's merge rules before explaining what runs unattended.
- "run the eval playbook" runs Eval.

Without `/solo`, a phrase such as "babysit this pr" can start tstack's standalone [`/babysit`](../babysit/SKILL.md) skill instead. The [Playbooks section](../solo/SKILL.md#playbooks) lists every playbook and when it applies. Read [Babysit](../solo/playbooks/babysit.md) or [Shipping](../solo/playbooks/shipping.md) for the port's PR workflow.

tstack has no planning skill. Claude Code's plan mode works alongside it. For work that spans phases or stacked PRs, asking `/solo` for a plan runs the [Multi-phase plan playbook](../solo/playbooks/multi-phase-plan.md), which writes the plan and doesn't implement it. For a design question, the Prototype playbook or `/architect` settles it in code first.

Principles are one-rule skills that `/solo` reads and cites in its replies. The user rarely invokes one. They steer with the names instead, as in "apply prove it works. show me the real output." On Claude Code the `principle-*` leaves are hidden from the slash menu and `/solo` reads them by path; other runtimes may list them in their skill picker. The [Principles index](../solo/SKILL.md#principles) lists them.

## Fix a run that went wrong

| Symptom | Fix |
|---|---|
| The mode stopped applying after a few turns | Check the current runtime's routing configuration through the sources under Get set up. Without automatic routing, invoke `solo` for each task. |
| A question got treated as the next step of the last task | Say "new task", or say the turn doesn't need the mode. |
| A new model choice had no effect | Read [setup-tstack](../setup-tstack/SKILL.md#other-runtimes) and the current runtime's mapping, then check its sheet location and loading method. |
| Runs cost more than expected | See the cost paragraph under Get set up. |
| A skill didn't load on its own | Read its description and the current runtime's skill-loading instructions. Invoke it explicitly when needed; `/solo` doesn't run every skill. |
| Two lanes overwrote each other | One writer per worktree or branch, and say which lane owns which files before briefing them. |
| An overnight run moved but finished nothing | Read [Autonomous run](../solo/playbooks/autonomous-run.md) and the current runtime's wake mechanism. For a queue, read the selected Autopilot playbook above. Give the run a check that can pass or fail. |
| The reply claims success from a green build | Ask for the real command, flow, stored value, or profile. That's the prove-it-works principle. |

For a run that drifts, [`references/prompting.md`](references/prompting.md) has one-line steers, and [`references/recipes.md`](references/recipes.md) has prompts to adapt.

## Make tstack my own

- `/solo write a skill for <workflow>` drafts a personal mode skill to use alongside it.
- [`/correct`](../correct/SKILL.md) turns a mistake agents keep repeating into something the repo makes impossible.
- `/solo write a skill for <workflow>` runs the authoring playbook. The eval playbook tests a skill change blind.
- Fix a misbehaving skill in its own PR, not inside the feature work where it went wrong.

## Reply

Lead with the answer. Give at most one example prompt in a code block, adapted from [`references/recipes.md`](references/recipes.md) when one fits, then the link to that file. Keep it short unless the user asked for the whole map.
