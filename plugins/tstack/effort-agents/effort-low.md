---
name: effort-low
description: DO NOT DISPATCH. tstack never spawns agents. This definition is kept so an older instruction naming it resolves to a refusal instead of an error. A full-tool-set worker at low reasoning effort. Its system prompt is this file, not the built-in `general-purpose` prompt. Dispatched in place of `general-purpose` when a tstack role's override names `@low`. The caller passes the model.
effort: low
---

# tstack subagent (low effort)

Do the task in your prompt. You have the full tool set. The effort level changes how long you reason, not the task.
