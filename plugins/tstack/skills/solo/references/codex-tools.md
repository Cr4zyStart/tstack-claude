# Codex tool mapping for tstack

tstack skills are written in Claude Code tool language (the `Skill` tool, the `Agent` tool, `AskUserQuestion`, Claude model names). On Codex the skills are the same files; only the tool names resolve differently. Read this when a tstack skill names a Claude tool, a driver or bundled skill, or a Claude model. This file is Codex-specific. Gemini CLI, opencode, Prime Agent, and other runtimes must use their own concrete tools, model names, and configuration paths.


> **tstack never spawns agents on any runtime.** The rows below that map Claude's
> `Agent` tool onto this platform's spawn primitive are kept only so you can *recognise*
> that machinery in older text and know what it corresponded to. Do not use them. Teamwork
> goes through the **team** skill: list the sessions the user already opened, message one,
> and fall back to sequential work when none are free. If this platform has no way to list
> or message an existing session, tstack is solo here, and that is a complete mode, not a
> degraded one.

## Tool actions

| tstack / Claude action | Codex equivalent |
|------------------------|------------------|
| Read a file | `shell` (`cat`, `head`, `tail`) |
| Create / edit / delete a file | `apply_patch` |
| Run a shell command | `shell` |
| Search file contents / find files | `shell` (`rg`, `grep`, `find`, `ls`) |
| Fetch a URL | `shell` with `curl` / `wget` |
| Search the web | `web_search` |
| Invoke a skill (the `Skill` tool, `/command`) | Skills load natively. Follow the instructions presented. |
| Free a finished subagent slot | `close_agent`, when the session exposes it. Some Codex hosts don't. |
| Track tasks (the todolist; `TaskCreate` / `TaskUpdate`, or `TodoWrite` on Claude Code) | `update_plan` |
| Ask the human a fixed-choice question (`AskUserQuestion`) | Ask in plain text and let the user answer. Codex has no structured-choice tool. |

tstack does not need Codex's `multi_agent` feature, and you should leave it off.

## No subagents

tstack never spawns. On Codex that means you do **not** enable `multi_agent`, do not call
`spawn_agent`, `wait_agent` or `close_agent`, and do not route anything through a
`tstack-agent` or `comment-sicko` type — none of which exist here anyway.

Codex has no way to list or message a Claude session the user opened, so **there are no
lanes on Codex**. Every tstack skill falls back to its sequential form, which is the form
each skill is written in: parts are worked in turn, candidates produced one after another, `interrogate` runs its seats as successive passes with a declared change of
stance, `why` works one evidence category at a time, `how` one angle at a time. Nothing is lost but wall-clock.

Keep the rest of the policy: file pointers rather than inlined context, one writer per
worktree or branch, and narrow reads (`grep -n`, then `sed -n X,Yp`).

## Model names

Skills name Claude defaults (a single-role default for code/prose/judgment plus a diverse-model panel for diverse-model panels; each model-consuming skill lists its own in a Models section). These slugs do not resolve on Codex. Substitute your configured Codex models:

- Single-model roles: your primary Codex model (for example `gpt-6-sol`).
- Roles that default to the strongest Claude model (`bug-fix`, `perf-issue`, `hillclimb`, `strongest judgment`): your strongest Codex model (for example `gpt-6-astra`).
- Diverse-model panels (`architect`, `interrogate`, `how` critics): the adversarial signal comes from model diversity, so use the distinct Codex models available to you. A good default panel on ChatGPT is `gpt-6-astra`, `gpt-6-sol`, `gpt-6-luna`. If only one model family is reachable, vary reasoning effort and note in the verdict that diversity was reduced.

`/setup-tstack` writes the configured model list. On Codex, set it to your Codex model slugs.

## Session routing hook

The native tstack plugin bundles the same `SessionStart` routing instruction as the Claude Code plugin, through `session-start.sh` on macOS and Linux and `session-start.ps1` on Windows. Codex runs the hook on startup, resume, clear, and compact after the user trusts the hook through `/hooks`. The hook reads `session hook` from the Codex sheet, at the path in [setup-tstack's runtime table](../../setup-tstack/SKILL.md#other-runtimes); `session hook: off` disables injection.

A skills-only installation does not include plugin hooks. Request `solo` explicitly or add a standing instruction to `AGENTS.md` in that case.

## Driver and bundled skills tstack references

The [driver policy](../SKILL.md#non-negotiables) selects the app driver. For skills and drivers named by these workflows, use these Codex equivalents:

| Skill or driver named in tstack | On Codex |
|---------------------------------|----------|
| `run` (drive a CLI/TUI to see a change work) | Run the app yourself via `shell` and observe the real output. |
| Project UI driver | Drive the UI with whatever automation you have, or hand the user a concrete manual check. Do not claim done without observing the artifact. |
| `plugin-dev:skill-development` (Claude's SKILL.md authoring guidance) | Follow your platform's skill-authoring guidance; the `writing-skills` skill if present. Keep `name` + `description` frontmatter and progressive disclosure. |
| `loop` (recurring/self-paced re-invocation, used by `babysit`) | Codex has no `loop` skill. Re-run the step yourself on a cadence, or use a Codex scheduled task if available. |

## Per-skill notes

Affected skill entry points and the optional Codex slash stubs point here. Most skills need only the tables above. These need one more mapping:

| Skill | On Codex |
|-------|----------|
| `interrogate` | Seats run as successive passes, each declaring the defect class it hunts that the last did not. Runs sequentially; there is no dispatch here (see No subagents above). |
| `setup-tstack` | The skill's Other runtimes table names the Codex sheet path and how it loads; the slugs are your Codex models (see Model names above). The role rows are identical. |
| `no-comments` | Read `solo/references/agents/comment-sicko.md` and apply it in this session. Nothing is dispatched. |
| `create-verification-skill` | The generated skill lands under `.claude/skills/verify/` on Claude Code; write it to Codex's project-skill location instead. The app-driving harness is platform-neutral. |
| `babysit` | `loop` and `AskUserQuestion` resolve through the tables above. |
| `architect` | The design panel is produced as successive passes, one candidate at a time. |
| `how` | Angles are explored one at a time, then synthesized. Runs sequentially; there is no dispatch here (see No subagents above). |
| `team` | Codex has no way to reach another session, so there are no lanes here. Work the units yourself in sequence and say that is what you did, per the skill's Falling back section. `spawn_agent` is not a substitute: a spawned agent is not a lane. |
| `why` | Evidence categories are worked one at a time, then synthesized. Runs sequentially; there is no dispatch here (see No subagents above). List MCP servers from the tools Codex exposes to the session, not from `.mcp.json` or `claude mcp list`. |

## Vendored scripts

`skills/solo/scripts/` ships the `watch-pr` PR watcher, the `orch` store CLI, and `worktree-audit.mjs`. The `watch-pr/ship-pr` command owns pending-merge inspection and cancellation; `resume.mjs` owns the shared checkpoint locator described in [Resume storage](resume-storage.md). These scripts use bun and Node.js and run the same on Codex; invoke them through `shell`. They need `bun`, `gh`, and (for stack work) `gt`. Run `worktree-audit.mjs` with `node`, as its shebang does. The audit follows each link in a worktree's ancestor directories with `stat` and matches it by the directory it lands on, under bun and node alike. A worktree whose own path bun cannot resolve loses its last chat and lands in `review`. A dangling or looping link is ignored. Any other link that `stat` cannot follow puts every worktree under the link's directory in `review`, with a warning that names the link. `worktree-audit.mjs` scans Codex sessions under `$CODEX_HOME/sessions` and `$CODEX_HOME/archived_sessions` (default `~/.codex`), along with any Claude Code or Pi transcript directory that exists. It imports the transcript walker from `skills/solo/scripts/find-transcript.mjs`.

## Instructions file

Where a tstack skill says "your instructions file", on Codex that is `AGENTS.md` (project root, plus `~/.codex/AGENTS.md` global). On Claude Code it is `CLAUDE.md`.
