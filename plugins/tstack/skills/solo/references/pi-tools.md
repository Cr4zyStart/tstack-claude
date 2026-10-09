# Pi tool mapping for tstack

tstack skills are written in Claude Code tool language (the `Skill` tool, the `Agent` tool, `AskUserQuestion`, Claude model names). On Pi the skills are the same files, loaded from the tstack package, and the package's Pi extension registers tools named after the Claude ones, so most names map one to one. Read this when a tstack skill names a Claude tool, a driver or bundled skill, or a Claude model. This file is Pi-specific.


> **tstack never spawns agents on any runtime.** The rows below that map Claude's
> `Agent` tool onto this platform's spawn primitive are kept only so you can *recognise*
> that machinery in older text and know what it corresponded to. Do not use them. Teamwork
> goes through the **team** skill: list the sessions the user already opened, message one,
> and fall back to sequential work when none are free. If this platform has no way to list
> or message an existing session, tstack is solo here, and that is a complete mode, not a
> degraded one.

## Tool actions

| tstack / Claude action | Pi equivalent |
|------------------------|---------------|
| Read a file | `read` |
| Create a file | `write` |
| Edit a file | `edit` (exact text replacement) |
| Delete a file | `bash` (`rm`) |
| Run a shell command | `bash` |
| Search file contents / find files | `grep`, `find`, and `ls` when enabled, otherwise `bash` (`rg`, `grep`, `find`, `ls`). Pi enables only `read`, `bash`, `edit`, and `write` by default. |
| Fetch a URL | `bash` with `curl` / `wget` |
| Search the web | Pi has no web search tool. Use an MCP server that provides one. |
| Invoke a skill (the `Skill` tool, `/command`) | Skills load natively. The model reads a skill when its description matches; `/skill:<name>` forces one. |
| Track tasks (the todolist; `TaskCreate` / `TaskUpdate`, or `TodoWrite` on Claude Code) | Pi has no task-tracking tool. Keep the `todo.md` checklist solo describes for that case. |
| Ask the human a fixed-choice question (`AskUserQuestion`) | `ask_user_question`, same shape. Without an interactive UI (print or JSON mode), and in a child agent, it returns an error, so ask in plain text. |
| Schedule a self-paced re-invocation (`ScheduleWakeup`) | `schedule_wakeup`, same shape. A due wakeup stays pending until the session is idle, including during manual compaction. `noop: true` only labels the wakeup, which is still scheduled, and `stop: true` cancels the pending wakeup and needs no other field. In print and JSON mode, and in a child agent, scheduling returns an error, because Pi exits when the run ends and the wakeup could never fire. After a `/loop` command ends or replaces the loop during a run, that run is refused every wakeup until it settles, whatever the prompt, and Pi tells the user. No other wakeup is refused. |
| Read this workspace's session transcripts (Claude Code's `~/.claude/projects/<encoded-cwd>/`) | Pi sessions live in `~/.pi/agent/sessions/--<cwd>--/` (under `$PI_CODING_AGENT_DIR` when set), where `<cwd>` is the working directory without its leading `/` and with each `/` as `-`. Subagent sessions the extension started live in `<agent dir>/tstack/<parent session id>/agents/`. Each file opens with a `session` header line; every later line is an entry with an `id` and a `parentId`, and a message entry is `type: "message"` with `message.role` `user`, `assistant`, or `toolResult`. A session keeps abandoned branches in the same file, so follow `parentId` back from the last entry for the conversation that happened. The same privacy rule applies: read only this workspace's directory, never a glob across `sessions/`. |

`send_message`, `list_agents`, `stop_agent`, `ask_user_question`, and `schedule_wakeup` come from the tstack Pi extension, which deliberately does not register an `agent` tool, which `pi install` of the tstack package loads. A skills-only setup has none of them, and the fan-out skills (`interrogate`, `why`, `how`, `arena`, `reflect`) degrade to a single sequential pass. A required independent review does not degrade. It stays blocked, as solo's [Lanes](../SKILL.md#lanes--never-subagents) section says.

## No subagents

tstack never spawns, and the tstack Pi extension no longer registers an `agent` tool, so
the spawn primitive is simply absent. `send_message`, `list_agents` and `stop_agent` remain
registered but only ever see agents this session started; with nothing spawning they return
empty, which is correct.

Pi has no way to list or message a Claude session the user opened, so **there are no lanes
on Pi**. Every tstack skill falls back to its sequential form, which is the form each skill
is written in: `swarm` works its parts in turn, `arena` produces candidates one after
another, `interrogate` runs its seats as successive passes with a declared change of stance,
`why` works one evidence category at a time, `how` one angle at a time. Nothing is lost but wall-clock.

Keep the rest of the policy: file pointers rather than inlined context, one writer per
worktree or branch, and narrow reads (`grep -n`, then `sed -n X,Yp`).

## Model names

Skills name models by the Claude aliases in their Models sections. On Pi, pass the alias as the `agent` tool's `model`. The tstack extension resolves it in the column of the provider the session's current model comes from, and in the `anthropic` column for any other provider:

| Alias | `anthropic` | `openai` | `openai-codex` |
| --- | --- | --- | --- |
| `opus` | `anthropic/claude-opus-5-5` | `openai/gpt-6.1-sol` | `openai-codex/gpt-6.1-sol` |
| `fable` | `anthropic/claude-fable-5-1` | `openai/gpt-6-astra` | `openai-codex/gpt-6-astra` |
| `sonnet` | `anthropic/claude-sonnet-5-5` | `openai/gpt-6-sol` | `openai-codex/gpt-6-sol` |
| `haiku` | `anthropic/claude-haiku-4-5` | `openai/gpt-6-luna` | `openai-codex/gpt-6-luna` |

Pi warns that Anthropic bills Claude used through Pi per token, as extra usage, even on a Claude subscription. Pi shows that warning only in interactive mode, never for the `pi --mode rpc` children the `agent` tool runs.

A `pi models: opus=<provider/id>, sonnet=<provider/id>` line in the Pi override sheet points each alias it names at another Pi model, whatever the session's provider. Add one when the session's provider has no column above and Pi has no credentials for `anthropic`, because each alias then resolves to an `anthropic/*` ID and the `agent` call fails with `No API key found for anthropic`. The `agent` tool also takes a full `provider/id`, passed through unchanged, and `inherit-parent`, `auto`, or no `model` runs the child on the parent's current model. Diverse-model panels (`architect`, `interrogate`, `how` critics) stay diverse only while their aliases resolve to distinct models. If one model family is all you can reach, vary the reasoning effort and note in the verdict that diversity was reduced.

`/setup-tstack` writes the configured model list. On Pi, keep the aliases and remap them with `pi models:`.

## Session routing

The tstack Pi extension adds the solo mandate, the text the Claude Code and Codex `SessionStart` hook injects, to the system prompt at every agent start, so the mandate survives compaction. It also adds the Pi override sheet, because Pi has no include syntax for context files. The sheet is `tstack-models.md` in the Pi agent directory, which is `$PI_CODING_AGENT_DIR` when set and `~/.pi/agent` otherwise. `session hook: off` in the sheet stops the mandate. Child agents that the `agent` tool starts get the sheet but not the mandate, as Claude Code subagents see CLAUDE.md but run no `SessionStart` hook. Every session, child agents and sessions with the hook off included, also gets a pointer to this file and Claude Code's sentence on making independent tool calls in one response.

Without the extension nothing is injected. Request `solo` explicitly with `/skill:solo`, or add a standing instruction to `AGENTS.md`.

## Driver and bundled skills tstack references

The [driver policy](../SKILL.md#non-negotiables) selects the app driver. For skills and drivers named by these workflows, use these Pi equivalents:

| Skill or driver named in tstack | On Pi |
|---------------------------------|-------|
| `run` (drive a CLI/TUI to see a change work) | Pi has no `run` skill. Run the app yourself via `bash` and observe the real output. |
| `verify` (the project's `.claude/skills/verify/`, or Claude Code's bundled `/verify`) | Pi does not discover `.claude/skills/`. Read the project skill's SKILL.md by path, or add `../.claude/skills` to the `skills` list in `.pi/settings.json`. Without a project skill, drive the app as for `run`. |
| Project UI driver | Drive the UI with whatever automation you have, or hand the user a concrete manual check. Do not claim done without observing the artifact. |
| `plugin-dev:skill-development` (Claude's SKILL.md authoring guidance) | Follow Pi's skills documentation and the Agent Skills specification. Keep `name` + `description` frontmatter, name the directory after the skill, and use progressive disclosure. |
| `loop` (recurring/self-paced re-invocation, used by `babysit`) | The extension's `/loop [interval] <prompt>` command. With an interval it re-fires on that cadence. Without one the prompt runs now and the model paces itself with `schedule_wakeup`. `/loop stop` cancels, also while an iteration runs: nothing that run then schedules is armed. A `/loop` given during a run starts once that run ends. |

## Per-skill notes

No skill file carries a Pi line. solo's Platform Adaptation section points here once, and the extension's system prompt points here in every session, so read a skill's row before you follow that skill. Most skills need only the tables above. These need one more mapping:

| Skill | On Pi |
|-------|-------|
| `solo` | The todolist falls back to `todo.md`, and the Subagents defaults map through Subagent policy above. The Eval and Session pickup playbooks read transcripts from the Pi sessions directory (see Tool actions). |
| `interrogate` | Seats run as successive passes, each declaring the defect class it hunts that the last did not. Runs sequentially; there is no dispatch here (see No subagents above). |
| `setup-tstack` | The Pi sheet is `tstack-models.md` in the Pi agent directory (see Session routing), and the extension loads it, so no include line is needed. List models with `pi --list-models`. For a family whose model is not listed, offer a `pi models:` line (see Model names). The role rows and the five effort levels are identical. The `session hook` line applies on Pi too, where `off` stops the extension adding the mandate. When the session runs on `anthropic`, tell the user that Pi bills Claude per token as extra usage and that each multi-model panel multiplies that cost. |
| `no-comments` | Read `solo/references/agents/comment-sicko.md` and apply it in this session. Nothing is dispatched: the extension registers no `agent` tool, and a worktree would start from `HEAD` and miss the scope's uncommitted changes anyway. |
| `create-verification-skill` | The generated skill lands under `.claude/skills/verify/` on Claude Code. Write it where Pi discovers project skills, `.pi/skills/verify/` or `.agents/skills/verify/`, instead. The app-driving harness is platform-neutral. |
| `babysit` | `loop` and `AskUserQuestion` resolve through the tables above. |
| `architect` | The design panel is produced as successive passes, one candidate at a time. |
| `how` | Angles are explored one at a time, then synthesized. Runs sequentially; there is no dispatch here (see No subagents above). |
| `team` | There are no lanes on Pi today. `list_agents` and `send_message` only ever address children this extension started, and it does not spawn, so the list is empty and a brief has nowhere to go (see No subagents above). Work the units yourself in sequence. |
| `why` | Evidence categories are worked one at a time, then synthesized. Runs sequentially; there is no dispatch here (see No subagents above). List MCP servers from the tools Pi exposes to the session or `pi mcp list`, not from `.mcp.json` or `claude mcp list`. |

## Vendored scripts

`skills/solo/scripts/` ships the `watch-pr` PR watcher, the `orch` store CLI, and `worktree-audit.mjs`. These scripts use bun and Node.js and run the same on Pi; invoke them through `bash`. They need `bun`, `gh`, and (for stack work) `gt`. Run `worktree-audit.mjs` with `node`, as its shebang does. The audit follows each link in a worktree's ancestor directories with `stat` and matches it by the directory it lands on, under bun and node alike. A worktree whose own path bun cannot resolve loses its last chat and lands in `review`. A dangling or looping link is ignored. Any other link that `stat` cannot follow puts every worktree under the link's directory in `review`, with a warning that names the link. `worktree-audit.mjs` finds each worktree's last chat in every runtime's transcript directory that exists: Claude Code's projects under `$CLAUDE_CONFIG_DIR` (default `~/.claude`), Codex's sessions and archived sessions under `$CODEX_HOME` (default `~/.codex`), and Pi's `sessions/` and the tstack extension's subagent sessions under `$PI_CODING_AGENT_DIR` (default `~/.pi/agent`). Pass transcript directories after the repo path to scan others instead. It imports the transcript walker from `skills/solo/scripts/find-transcript.mjs`.

## Instructions file

Where a tstack skill says "your instructions file", on Pi that is `AGENTS.md` or `CLAUDE.md`, which Pi loads from the working directory and each parent directory, plus `~/.pi/agent/AGENTS.md` for every directory. On Claude Code it is `CLAUDE.md`.
