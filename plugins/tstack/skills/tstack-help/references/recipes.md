# Prompts worth copying

Swap in the real paths, skills, and done checks. Informal wording works.

## Understand

- `/solo read <thread>. restate the underlying issue in your own words, in plain english.`
- `/solo investigate why <symptom>. give me what we know, what data you used, and your best hypotheses. don't change any code yet.`
- `use /how to understand <subsystem>. then use /why to find out why it broke recently.`
- `/why was it implemented this way and not <other way>? what did you trade off?`
- `/solo take over this branch. read the decision log, find what's done, and continue. don't redo finished work.`

## Build

- Bug: `/solo <symptom>. repro first, then fix and verify.`
- Bug in an app: `/solo repro this with /verify. if it repros on main, fix it and show me a video as proof.`
- Bug with a cheap test: `/solo repro <bug> first. if there's a cheap test path, /tdd it. then fix and rerun.`
- Feature: `/solo add <behavior>. <current output> stays byte-identical. verify both.`
- Refactor: `/solo move <code> into one module, zero behavior change. record the current output first and prove it's unchanged after.`
- Perf: `/solo <operation> takes <time> on <fixture>. trace it, fix the measured cause, show me before and after.`
- Split across sessions: `/team <work> is three independent units. one lane each, brief with paths and line ranges, I keep the hardest.`
- Only one session open: `/team` says so and works the units in sequence itself — open a second tab in the same project first if you want lanes.

## Design and plan

- `/solo prototype a few options for <feature>. take screenshots or videos for me to compare.`
- `/solo we need <feature>. /architect it first, and answer open questions with prototypes. let me review before proceeding.`
- `/solo write a tutorial for how i would use <new package> first. then explain plainly why it beats the current one.`
- `/solo turn this design into a plan. small verifiable PRs, each with its own verification steps.`
- `/solo plan the migration of <library> to <target>. small verifiable PRs. the result must match the original exactly, bugs included.`

## Review and ship

- `/interrogate the whole branch, but skeptically. don't change anything yet. no nitpicks unless it's a real bug or regression.` Read the dismissals too.
- `/solo check every package under <dir> against its check script. one at a time. one report.`
- `/solo open the pr. small ordered commits, evidence in the description.`
- `/solo babysit this pr. get it green.` For status only: `/solo check on pr <number>. anything outstanding?`
- `/solo land the stack.`

## Away and back

- `/solo im going to bed. <goal> in a fresh worktree off <base>. done means <checks>. keep a decision log. don't ask me before committing. /loop until done. if you're truly stuck after a few hours, stop and write up why.`
- `/solo full autopilot on this queue. each item is independent.`
- `/solo autopilot these changes but stack them, don't ship. i'll land the stack.`
