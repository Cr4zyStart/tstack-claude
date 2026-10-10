# tstack

**Go deep without burning your weekly budget.**

![skills](https://img.shields.io/badge/skills-43-blue)
![commands](https://img.shields.io/badge/commands-20-blue)
![subagents spawned](https://img.shields.io/badge/subagents%20spawned-0-brightgreen)
![license](https://img.shields.io/badge/license-MIT-lightgrey)

tstack is a token-frugal fork of [pstack-claude](https://github.com/michael-denyer/pstack-claude), itself a Claude Code port of Lauren Tan's [pstack](https://github.com/cursor/plugins/tree/main/pstack) for Cursor. Same rigorous workflows. One session doing the work.

## Why this fork exists

pstack is excellent, and it is expensive. Its best workflows fan out: a design bakeoff spawns N subagents, a review panel spawns three, a swarm spawns one per slice. **Every spawned agent starts with an empty context and re-reads the files the parent already paid for.** Run a few panels in an afternoon and the weekly budget is gone.

tstack keeps the workflows and removes the fan-out.

| | pstack | tstack |
|---|---|---|
| Parallel work | spawns subagents | **messages sessions you already opened** |
| No one free | spawns anyway | works the passes in sequence |
| Registered agent types | 12 | **0** — `"agents": []` in the manifest |
| Reading a file | often whole | `grep -n` to find, `sed -n X,Yp` to print |
| Review panel | 3 agents | 3 passes, each declaring a different stance |

Nothing is lost but wall-clock. A sequential pass reaches the same place as a spawned one; it just arrives later and costs once.

> **A fair warning, not a benchmark.** This README quotes no percentages because nobody measured any. The savings are mechanical: an agent that is never created cannot re-read your repo. How much that is worth depends on how much you were fanning out.

## The four shapes

Pick how the work runs, and whether it has to prove itself, at the prompt:

| | no verification | verification enforced |
|---|---|---|
| **one session** | `/solo-nv` — prototypes and spikes | `/solo-ev` — proven on the real artifact |
| **across sessions** | `/team-nv` — parallel exploration | `/team-ev` — plus an independent verdict |

`/solo` and `/team` leave verification to your prompt. The suffixed four decide it for you.

**`-nv` is honest about what it skipped.** Every reply ends with an `Unverified:` block listing each unproven claim and the cheapest way to prove it. An empty list is not allowed — if nothing is unproven, you were in the wrong skill.

**`-ev` will not take your word for it.** A green suite is not the artifact. For a bug, the failure gets reproduced on the same surface the user sees *before* the fix. And when the work needs a second opinion, it cannot come from the agent that wrote it — no free lane and no human available means it records `BLOCKED: independent review` and stops, rather than shipping on its own say-so.

## Lanes, not spawns

A **lane** is a Claude session you already have open — a second tab, another window. tstack finds them with `ListAgents` and briefs them with `SendMessage`.

A brief carries **paths and line ranges, never pasted file contents**, so the lane reads what it needs instead of inheriting a copy of your context. It restates the house rules verbatim, and the work comes back checked against the tree rather than quoted.

No lanes open? It works in sequence and says so. **tstack will never ask you to open tabs so it can have a team.**

## Install

### Claude Code

Run in Claude Code:

```text
/plugin marketplace add Cr4zyStart/tstack-claude
/plugin install tstack@tstack-claude
```

**Remove any pstack install first:** both plugins ship `architect`, `how`, `why`, `interrogate`, `tdd`, `no-comments` and `correct`, so together they give you two of each and two SessionStart hooks with contradicting routing mandates.

### Codex

Run in your terminal:

```shell
codex plugin marketplace add Cr4zyStart/tstack-claude
codex plugin add tstack@tstack-claude
```

### Pi

Run in your terminal:

```shell
pi install git:github.com/Cr4zyStart/tstack-claude
```

The package loads the skills and the tstack Pi extension, which adds the subagent, question, and wake-up tools the skills use, plus `/loop` and the routing instruction. Invoke a skill with `/skill:<name>`.

### GitHub Copilot

Run in your terminal:

```shell
copilot plugin marketplace add Cr4zyStart/tstack-claude
copilot plugin install tstack@tstack-claude
```

This installs tstack for the Copilot CLI and the GitHub Copilot app, which share `~/.copilot`. Start a new session afterwards. Copilot ships no default tstack models, so the first skill that needs one runs `setup-tstack` to pick from the models your account lists, and later sessions reuse that choice.

**On Windows, install 0.9.80 or later.** Earlier builds of the PreToolUse hook approved a vendored script run that wrote to any absolute path, inside the workspace or not. It decided whether a path was absolute by testing for a leading slash, and a Windows path such as `C:/x` has none, so it was treated as relative and joined to the working directory. Since `log.sh` appends to whatever path it is given, an approved command could append to any file on disk without a prompt. Details in [CHANGES](CHANGES.md).

The Copilot build is tested on Copilot CLI 1.0.87 through 1.0.92. On those versions the routing hook's context reaches the session alongside other plugins' session-start context. If a later version keeps only one plugin's context, `setup-tstack` offers a [standing instruction](plugins/tstack/skills/setup-tstack/copilot.md#wire-it-in) for `~/.copilot/copilot-instructions.md` instead. On 1.0.92, once the CLI caches its computer-use experiment assignment, `copilot -p` sessions list no plugin skills and a `skill` call returns "Skill not found". Interactive sessions, the hooks, and the agents are unaffected.

Run `setup-tstack` to change model defaults, set a reasoning effort per role (for example `architect runners: opus @xhigh, fable @max`, which Claude Code dispatches through the plugin's `tstack:effort-<level>` or `tstack:tstack-agent-<level>` agents; roles without a level keep the session's effort unless the sheet's `default effort` line names one), or turn automatic routing off. The plugin installs the routing hook on Claude Code, Codex, and GitHub Copilot; Codex asks you to trust it through `/hooks` before it runs. On Pi the extension injects the same routing instruction. In Claude Code and the Copilot CLI, use `/tstack:setup-tstack`.

For Prime Agent, OpenCode, Gemini CLI, or skills-only installs for any harness, see [shared installation](docs/reference.md#shared-skills-installation).

## Getting started

```text
Use solo to fix the search filter resetting when I change pages.
```

For a bug, it reproduces the failure, uses `how` and `why` to investigate, writes the fix itself or briefs an open lane, then reruns the failing case. If the fix crosses a function boundary, it brings in `architect` before implementation. You receive the fix and the failing and passing evidence.

[Other playbooks](plugins/tstack/skills/solo/SKILL.md#playbooks) cover planning, features, refactoring, performance issues, investigations, prototypes, PR maintenance, shipping, and longer projects.

![solo on Claude Code, Codex, and Pi turns a request into verified work. Choose a playbook, plan with architect, then review and verify with interrogate, tests, and measurements. Project playbooks customize the workflow, and setup-tstack configures the model and reasoning effort per role. Supporting skills include how, why, and unslop.](assets/tstack-overview.png)

## Details

- [Skills and slash commands](docs/reference.md#slash-commands)
- [Runtime setup](docs/reference.md#runtime-support)
- [Models and dependencies](docs/reference.md#configuration-and-dependencies)
- [Maintenance and port scope](docs/reference.md#maintenance)
- [Changes by version](CHANGES.md)

## Data handling

tstack has no server or telemetry. Anything its skills ask your agent to read, including session transcripts, goes to your model provider. Scripts run locally, and PR tools use your GitHub CLI login.

## Contributing

Thanks for helping make this port better. Bug reports, documentation fixes, and runtime improvements are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the checks and where your change belongs. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

This port, including its modifications and additions, is also [MIT-licensed](LICENSE), © 2026 Michael Denyer. Original pstack © 2026 Lauren Tan; imported cursor-team-kit skills © 2026 Cursor. See [LICENSE-cursor-team-kit](LICENSE-cursor-team-kit) and [NOTICE.md](NOTICE.md).
