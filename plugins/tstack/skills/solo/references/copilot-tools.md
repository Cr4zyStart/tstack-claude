# GitHub Copilot tool mapping for tstack

tstack skills are written in Claude Code tool language (the `Skill` tool, the `Agent` tool, `AskUserQuestion`, Claude model names, `~/.claude/` paths). On GitHub Copilot the skills are the same files; only the tool names, model IDs, and paths resolve differently. Read this when a tstack skill names a Claude tool, a driver or bundled skill, a Claude model, or a Claude Code path. It covers both the Copilot CLI and the Copilot app, which load the same plugin. This file is Copilot-specific; other runtimes use their own equivalents.


> **tstack never spawns agents on any runtime.** The rows below that map Claude's
> `Agent` tool onto this platform's spawn primitive are kept only so you can *recognise*
> that machinery in older text and know what it corresponded to. Do not use them. Teamwork
> goes through the **team** skill: list the sessions the user already opened, message one,
> and fall back to sequential work when none are free. If this platform has no way to list
> or message an existing session, tstack is solo here, and that is a complete mode, not a
> degraded one.

## Tool actions

| tstack / Claude action | GitHub Copilot equivalent |
|------------------------|---------------------------|
| Read a file (`Read`) | `view` |
| Create a file | `create` |
| Edit a file | `edit` |
| Run a shell command | `bash` |
| Search file contents / find files | `grep` / `glob` |
| Fetch a URL | `web_fetch` |
| Search the web | `web_search` |
| Invoke a skill (the `Skill` tool, `/command`, `tstack:<skill>`) | The `skill` tool with the bare skill name (`solo`, not `tstack:solo`). A user types `/tstack:<skill>` in the CLI prompt; on CLI 1.0.89 a bare `/<skill>` reports an unknown command for a plugin skill. Copilot's prompt lists only part of a large plugin's skills (a character budget cuts the alphabetical tail); a skill missing from that list still loads by name. |
| Track tasks (the todolist; `TaskCreate` / `TaskUpdate`, or `TodoWrite` on Claude Code) | The `sql` tool against the session database's built-in `todos` table (plus `todo_deps` for ordering). |
| Ask the human a fixed-choice question (`AskUserQuestion`) | `ask_user` with a `choices` list, one question per call. Where `ask_user` takes an elicitation form instead (`message` and a `requestedSchema`, as on Copilot CLI 1.0.89), one `oneOf` string property is the choice list. Treat it as single-select only, because the Copilot app's `ask_user` has no multi-select, and the UI adds a free-text option on its own. Emulate multi-select with sequential questions. |
| Search Claude Code transcripts under `~/.claude/projects/` | Copilot session state, scoped to the current workspace; see Transcripts below. |

## No subagents

tstack never spawns. On GitHub Copilot that means no `task` calls, in any mode, and the
plugin's agent definitions are not dispatch targets even though Copilot will load them as
agent types.

Copilot has no way to list or message a Claude session the user opened, so **there are no
lanes on Copilot**. Every tstack skill falls back to its sequential form, which is the form
each skill is written in: parts are worked in turn, candidates produced one after another, `interrogate` runs its seats as successive passes with a declared change of
stance, `why` works one evidence category at a time, `how` one angle at a time. Nothing is lost but wall-clock.

Four Claude Code spellings survive in the skill prose. None of them is a dispatch
instruction here:

| Spelling | What it means on Copilot |
|---|---|
| the `Agent`/`Task` tool | Nothing to call. `solo` names it only to forbid it, and Copilot's `task` is forbidden on the same grounds. |
| `subagent_type` | An agent type name tstack never passes. Where `team` greps for it, it is auditing for spawn attempts, not making one. |
| `general-purpose` | The stock agent type, never dispatched. In `principle-boundary-discipline` the words are ordinary English about mechanism, not an agent. |
| `run_in_background: true` | Background *shell* commands, which are allowed: run them with `bash` and read the output yourself. A watcher or a long test run is not an agent. |
| `/fleet` | The Claude Code app's view of several sessions at once. No Copilot equivalent, and nothing depends on one: track parallel work with `git worktree add` and the todolist. |

Keep the rest of the policy: file pointers rather than inlined context, one writer per
worktree or branch, and narrow reads (`grep -n`, then `sed -n X,Yp`).

## Model names

Skills name Claude Code model aliases in their Models sections. Those aliases are not Copilot model IDs, and the Copilot build ships no default model IDs: the models an account can reach depend on its plan and policy, so the user picks them once.

- The model sheet is `${COPILOT_HOME:-~/.copilot}/tstack-models.md`. It sits outside the workspace, so reading it asks for path access. The plugin's SessionStart hook reads it, checks it, and adds its role lines to the session context as the user's saved tstack model choices. Take role models from that block and do not `view` the sheet. A role line names the model for that role.
- Read the sheet only when that block and the hook's `sheet invalid` or no-sheet note are all missing, as in a skills-only install with no hook. `view`, `create`, and `edit` take literal paths and expand neither `~` nor `$COPILOT_HOME`, so print the sheet's absolute path with `bash` first (`echo "${COPILOT_HOME:-$HOME/.copilot}/tstack-models.md"`) and read and write exactly that path; do not append `.copilot` or any other segment to it. A session with its own `COPILOT_HOME` then never touches `~/.copilot`.
- No sheet, or the hook reports `sheet invalid`: before a skill that needs a role model (`architect`, `how`, `interrogate`, `solo`, `why`), stop, load `setup-tstack` with the `skill` tool, and finish it first. In that same session, use the values it just wrote; later sessions get them from the hook. Do not ask again on later runs.
- A role line in the sheet is the user's explicit model instruction, so pass it as the `task` tool's `model` parameter. `inherit-parent` or `auto` omits `model`.
- The plugin's `PreToolUse` hook enforces this for tstack agents. While the sheet is valid, it denies a `task` call whose `agent_type` starts with `tstack:` and whose `model` is not one of the sheet's values, and its reason lists the saved IDs. Retry with the role's saved model; never retry on another unsaved model. It leaves calls with no `model` and other agent types alone.
- Roles that default to the strongest model (`bug-fix`, `perf-issue`, `hillclimb`, `strongest judgment`): the strongest model the user chose.
- Diverse-model panels (`architect`, `interrogate`, `how` critics): the adversarial signal comes from model diversity, so fill a panel from distinct vendors in the `task` tool's `model` list (Claude, GPT, Gemini, Grok, and so on). tstack ships no default Copilot panel. If only one vendor is reachable, vary reasoning effort and note in the verdict that diversity was reduced.

`setup-tstack` lists the models from the `model` enum of the `task` tool and writes only IDs it saw there. After it writes the sheet, it runs its `check-sheet.sh` script, which applies the hook's checks.

Run `setup-tstack`, and the parent session that orchestrates a panel, on a model at least as strong as gpt-5.4-mini or a Sonnet-class Claude model. On a Haiku-class model, setup picked models the user never chose in about half of the smoke runs.

## Session routing hook

The plugin's `SessionStart` hook runs on the Copilot CLI and in the Copilot app. Copilot loads the plugin through its own Copilot manifest and hook file, not the Claude Code ones. The hook prints the routing mandate as the `additionalContext` JSON Copilot injects. It reads `${COPILOT_HOME:-~/.copilot}/tstack-models.md`, which the session itself cannot read without a path-access prompt. `session hook: off` disables injection. When the sheet passes the checks `check-sheet.sh` applies, the injected context ends with one line per role, rebuilt from the checked values; no other sheet text reaches the context. When it fails them, the context says `sheet invalid` and names each problem. With no sheet, it says so. Either way it tells the session to run `setup-tstack` before the first skill that dispatches on role models. The mandate names skills as `tstack:<skill>`; on Copilot load them by bare name.

If the mandate is missing from a session (a skills-only install, a Copilot version that drops plugin hook context, or another plugin's hook replacing it), add the standing instruction `setup-tstack` describes to `~/.copilot/copilot-instructions.md`, or request `solo` explicitly.

## Plugin file access

Copilot limits file access to the workspace and the system temporary directory, so reading a playbook, reference, or script from the installed plugin would ask for path access on every session, and a `-p` run without `--allow-all-paths` would deny it. The plugin's `PreToolUse` hook approves two kinds of call.

- `view` of a path inside `COPILOT_PLUGIN_ROOT` that has no `.` or `..` segment.
- `bash` that runs a registered script by its absolute path under `COPILOT_PLUGIN_ROOT/skills/`, using its documented arguments. The registered scripts are `log.sh` (run with `bash`), `check-sheet.sh` (run with `sh` or `bash`), and `find-transcript.mjs`, `resume.mjs`, `check-plan.mjs`, `check-playbooks.mjs`, and `worktree-audit.mjs` (run with `node`). Direct execution is also accepted. The hook checks each script's argument contract: for example, only the first of `log.sh`'s six arguments is a filename; the others are prose. Resume accepts its operation first, then `--project`, `--note`, and repeated `--artifact` paths as applicable, using either `--option=value` or `--option value`.

Each argument is a plain word of letters, digits, and `_ . / : = @ % + , -`, or a single-quoted string with no quote inside. Path operands may not climb with `..` and must resolve inside the workspace after following directory symlinks; a path in the plugin takes the normal permission flow, so no approved script can rewrite the context every session loads. File and dangling symlinks take the normal permission flow. The command holds none of `; | & $`, a backtick, `< > ( ) \`, a double quote, or a newline. Run one command per call, with no pipe or redirect. Unknown scripts, unrecognized argument forms, and mismatched interpreters take the normal permission flow.

Every other call, including a script run in any other form and `grep` or `glob` in the plugin's tree, takes the normal permission flow. So does a command that asks to bypass the sandbox, because Copilot prompts for a bypass whatever a hook answers. The hook does not approve scripts when the plugin sits inside the workspace or the workspace inside the plugin, since a session could edit a script and then run it. Where that hook does not run (a skills-only install, or hooks disabled), start the CLI with `--add-dir <plugin directory>` or run `/add-dir <plugin directory>` in the session; a GitHub marketplace install lives under `${COPILOT_HOME:-~/.copilot}/installed-plugins/<marketplace>/tstack`.

## App and CLI

The Copilot app loads the same plugin as the CLI and adds session-level tools. Use the app primitive when it is present in your tool list; otherwise use the CLI fallback.

| tstack need | Copilot app | Copilot CLI |
|-------------|-------------|-------------|
| Isolated writer (swarm worker, stack layer, orchestrate worker) | `create_session`, one worktree session per writer | `git worktree add` per writer, then take each writer yourself in turn — tstack does not spawn, so the isolation is the worktree, not a second agent |
| Recurring wake-up (`loop`, the `/loop` audit tick, babysit's cadence) | `save_session_automation` on this session | Re-run the step yourself each turn, or ask the user to re-invoke; state the cadence in the decision trail |
| Coordinate several sessions or repos (`orchestrate`, `autopilot-full`) | The app's `orchestrate` skill plus `send_session_message` | One worktree per track and you working them in sequence; a second human-opened session is a lane you message, never a spawned worker |
| Stacked PRs (`autopilot-stack`, shipping a stack) | The app's `pr-stack` skill, one child session per layer | `gt` or `gh`, one worktree per layer |
| Watch a PR to merge (`babysit`, `watch-pr`) | Agent merge on the session, or `babysit` with `save_session_automation` | `babysit` with the vendored `watch-pr` script and `gh` |
| Drive a UI | The `browser` canvas, or your browser automation | Your browser automation, or a concrete manual check for the user |

## Transcripts

Claude Code keeps one directory per project under `~/.claude/projects/<encoded-cwd>/`. Copilot keeps one directory per session under `${COPILOT_HOME:-~/.copilot}/session-state/<session-id>/`, for every project together:

- `events.jsonl` is the transcript. The first record is `session.start` with `data.context.cwd`; user turns are `{"type":"user.message","data":{"content":...}}`.
- `workspace.yaml` names the session's `cwd`. Scope every transcript search to the current workspace: keep only session directories whose `cwd` is the workspace path (or a worktree of it), then read their `events.jsonl`. Never read other projects' sessions.
- When a skill says "this session's transcript", it is the newest matching session directory whose `events.jsonl` contains the opening prompt.

In solo's playbooks, `eval` reads candidate transcripts from Copilot session state, and `session-pickup` and `worktree-cleanup` search it scoped to the workspace. `orchestrate` and `multi-phase-plan` keep their store under `${COPILOT_HOME:-~/.copilot}/orchestrate/` instead of `~/.claude/orchestrate/`.

## Driver and bundled skills tstack references

The [driver policy](../SKILL.md#non-negotiables) selects the app driver. For skills and drivers named by these workflows, use these Copilot equivalents:

| Skill or driver named in tstack | On GitHub Copilot |
|---------------------------------|-------------------|
| `run` (drive a CLI/TUI to see a change work) | Run the app yourself via `bash` and observe the real output. |
| Project UI driver | Drive the UI with whatever automation you have (the app's `browser` canvas, a browser skill), or hand the user a concrete manual check. Do not claim done without observing the artifact. |
| `plugin-dev:skill-development` (Claude's SKILL.md authoring guidance) | Follow the Agent Skills conventions: a `SKILL.md` with `name` + `description` frontmatter, progressive disclosure into `references/`, and solo's [authoring-a-skill playbook](../playbooks/authoring-a-skill.md). |
| `loop` (recurring/self-paced re-invocation, used by `babysit`) | Copilot has no `loop` skill. In the app use `save_session_automation`; on the CLI re-run the step yourself on a cadence. |

## Per-skill notes

Affected skill entry points point here. Most skills need only the tables above. These need one more mapping:

| Skill | On GitHub Copilot |
|-------|-------------------|
| `interrogate` | Seats run as successive passes, each declaring the defect class it hunts that the last did not. Runs sequentially; there is no dispatch here (see No subagents above). Keep the panel's vendors distinct. |
| `setup-tstack` | The skill's Other runtimes table names the Copilot sheet path and how it loads. Its [Copilot setup questions](../../setup-tstack/copilot.md) list models from the `task` tool's `model` enum and ask one `ask_user` question per tier and panel slot, grouped by vendor, with no recommended model; a first question lets a plan with one model, or anyone who wants no per-role choices, run every role on the session's model. The role rows are identical; the `session hook` line also controls the Copilot hook. |
| `architect` | The runner panel is produced as successive passes, one candidate at a time. |
| `how` | Angles are explored one at a time, then synthesized. Runs sequentially; there is no dispatch here (see No subagents above). |
| `no-comments` | Read `solo/references/agents/comment-sicko.md` and apply it in this session. Nothing is dispatched. |
| `team` | A lane is a session you already have open. In the app, the session list is your `ListAgents` and `send_session_message` is the brief channel; keep the brief to paths and line ranges as the skill says. The CLI has neither, so there lanes do not exist and the work is sequential. Never `task`. |
| `why` | Available MCP servers appear in your tool list; there is no `mcp__` prefix convention to scan for. |
| `create-verification-skill` | The generated skill lands under `.claude/skills/verify/` on Claude Code; on Copilot write it to `.github/skills/verify/`. The app-driving harness is platform-neutral. |
| `babysit` | `loop` and `AskUserQuestion` resolve through the tables above; in the app, `save_session_automation` is the cadence. |

## Vendored scripts

`skills/solo/scripts/` ships the `watch-pr` PR watcher, the `orch` store CLI, `resume.mjs`, and `worktree-audit.mjs`. They use bun and Node.js and run the same on Copilot; invoke them through `bash` in the form Plugin file access above describes. They need `bun`, `gh`, and (for stack work) `gt`. `worktree-audit.mjs` finds each worktree's last chat in Claude Code transcripts under `~/.claude/projects/`, in Codex and Pi sessions, and in Copilot sessions under `${COPILOT_HOME:-~/.copilot}/session-state`. Pass transcript directories after the repo path to scan others instead. It imports the transcript walker from `skills/solo/scripts/find-transcript.mjs`.

## Instructions file

Where a tstack skill says "your instructions file" or `CLAUDE.md`, on Copilot that is `AGENTS.md` or `.github/copilot-instructions.md` in the repository, and `~/.copilot/copilot-instructions.md` for every repository. Copilot also reads a repository's `CLAUDE.md`. Copilot does not expand `@~/` includes in user-level instructions, so the plugin hook injects the model sheet's role lines instead, as Model names above describes.

## Skill locations

Where a tstack skill names `.claude/skills/`, on Copilot project skills live under `.github/skills/` (Copilot also reads `.claude/skills/` and `.agents/skills/`), and personal skills under `~/.copilot/skills/` or `~/.agents/skills/`.
