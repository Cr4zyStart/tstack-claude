// Port-local rules live in files the port has forked, which tools/sync.mjs
// three-way merges: a clean merge is written, and a conflict is written with
// markers for a human to resolve. A rule dropped in either reads as a clean
// sync, so each one is pinned here by the sentence that carries it, with the
// issue or PR that earned it.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const skillsDir = fileURLToPath(new URL("../plugins/tstack/skills", import.meta.url));

const rules = [
  {
    source: "#71 callable driver policy",
    file: "solo/SKILL.md",
    phrase: "fall back to `run` when the repo has none",
  },
  {
    source: "#71 generated skill name",
    file: "create-verification-skill/SKILL.md",
    phrase: "YAML frontmatter (`name: verify`",
  },
  {
    source: "#71 preserve the original generator trigger",
    file: "create-verification-skill/SKILL.md",
    phrase: "make a control skill for this repo",
  },
  {
    source: "#71 maintain older generated skills",
    file: "create-verification-skill/SKILL.md",
    phrase: "or `.claude/skills/verify-*/` from an older generator",
  },
  {
    source: "#72 task fallback keeps skipped steps",
    file: "solo/SKILL.md",
    phrase: "with the playbook steps verbatim and each `skip: <reason>` line",
  },
  {
    source: "#72 task fallback is a local checklist",
    file: "solo/SKILL.md",
    phrase: "an uncommitted `todo.md` Markdown checklist",
  },
  {
    source: "#229 parallel sessions keep separate todolists",
    file: "solo/SKILL.md",
    phrase: "When several sessions share the checkout, name it `.audit/<task-slug>.todo.md`",
  },
  // FIX [Claude AI - Opus 5] (2026-10-08 21:34:05): upstream #58 "stop before you
  // re-delegate" and #59 item 1 "drain the roster" are dropped, not lost: both tell
  // you how to stop agents you spawned, and tstack spawns none. The worktree
  // substance they protected survives as the one-writer-per-worktree rules above.
  {
    source: "#58 delegate isolation",
    file: "solo/playbooks/feature.md",
    phrase: "Give every file-writing lane its own worktree",
  },
  {
    source: "#228 delegate worktree starts from the branch",
    file: "solo/playbooks/feature.md",
    phrase: "create its worktree with `git worktree add <path> -b <lane-branch> HEAD`",
  },
  {
    source: "#59 item 2 verify the process",
    file: "principle-prove-it-works/SKILL.md",
    phrase: "Verify the process as well as the outcome.",
  },
  {
    source: "#59 item 3 red is a colour",
    file: "principle-prove-it-works/SKILL.md",
    phrase: "Red is a colour, not a measurement.",
  },
  {
    source: "#59 item 3 quote the failure content",
    file: "tdd/SKILL.md",
    phrase: "Quote the failure content",
  },
  {
    source: "#59 item 4 search the places the rules name",
    file: "solo/SKILL.md",
    phrase: "A search that skips a place the project's rules name is not exhausted.",
  },
  {
    source: "#59 item 5 blast-radius before design",
    file: "blast-radius/SKILL.md",
    phrase: "a brief that asserts something about existing code",
  },
  {
    source: "#59 item 6 load the platform skill",
    file: "solo/SKILL.md",
    phrase: "load that platform's skill",
  },
  {
    source: "#59 item 7 severity picks the artifact",
    file: "solo/SKILL.md",
    phrase: "severity decides its artifact, not where it turned up",
  },
  {
    source: "#86 confirm the first status read",
    file: "solo/playbooks/babysit.md",
    phrase: "confirm that the PR or stack it reports matches the request",
  },
  {
    source: "autopilot verify loop: only findings the diff causes go back",
    file: "solo/playbooks/autopilot-full.md",
    phrase: "A finding blocks the merge only when the diff causes it",
  },
  {
    source: "autopilot verify loop: bounded rounds",
    file: "solo/playbooks/autopilot-full.md",
    phrase: "Two fix-forwards per PR is the ceiling.",
  },
  {
    source: "autopilot verify loop: size stated before fan-out",
    file: "solo/playbooks/autopilot-full.md",
    phrase: "A program of more than three owners waits for the operator's go on that size",
  },
  {
    source: "#188 no self-review in place of an independent one",
    file: "solo/SKILL.md",
    phrase: "Never count your own review, passing tests, or CI as the independent verdict.",
  },
  {
    source: "#188 a missing reviewer blocks the gate",
    file: "solo/SKILL.md",
    phrase: "Record `BLOCKED: independent review` in the todolist",
  },
  {
    source: "port tstack-mode->solo rename: team is the only teamwork route",
    file: "solo/SKILL.md",
    phrase: "hand them to lanes per the **team** skill when lanes exist",
  },
  {
    source: "port lane protocol: a brief carries pointers, never contents",
    file: "team/SKILL.md",
    phrase: "Do not spawn agents. Read narrow: grep -n to find lines, sed -n X,Yp to print them.",
  },
  {
    source: "port lane protocol: sequential is not a degraded mode",
    file: "team/SKILL.md",
    phrase: "Sequential is the default and it is not a lesser mode",
  },
  {
    source: "port lane protocol: never conscript the user into opening tabs",
    file: "team/SKILL.md",
    phrase: "Never ask the user to open tabs so you can have a team",
  },
  {
    source: "port -nv: an unproven run must declare what it did not prove",
    file: "solo-nv/SKILL.md",
    phrase: "End every reply with an `Unverified:` block",
  },
  {
    source: "port -nv: the gap list cannot be empty",
    file: "solo-nv/SKILL.md",
    phrase: "An empty list is not allowed",
  },
  {
    source: "port -nv: prototyping never licenses shipping unproven work",
    file: "solo-nv/SKILL.md",
    phrase: "It is not a decision to ship unproven work",
  },
  {
    source: "port -ev: a green suite is not the artifact",
    file: "solo-ev/SKILL.md",
    phrase: "and a green suite are not the artifact",
  },
  {
    source: "port -ev: a fix with no before-state is a guess",
    file: "solo-ev/SKILL.md",
    phrase: "show the failure on the same surface the user sees, before the change",
  },
  {
    source: "#188 carried into -ev: the verdict cannot come from you",
    file: "solo-ev/SKILL.md",
    phrase: "never count your own review, passing tests, or CI as the independent verdict",
  },
  {
    source: "#188 carried into -ev: a missing reviewer blocks rather than degrades",
    file: "solo-ev/SKILL.md",
    phrase: "record `BLOCKED: independent review` in the todolist and stop there",
  },
  {
    source: "port -nv across lanes: claim-checking is not artifact verification",
    file: "team-nv/SKILL.md",
    phrase: "Check a lane's claims against the tree before you repeat them",
  },
  {
    source: "port -nv across lanes: one writer per file even for a prototype",
    file: "team-nv/SKILL.md",
    phrase: "One writer per file.** Even for a prototype",
  },
  {
    source: "#188 carried into team-ev: the reviewer lane stays out of the writing",
    file: "team-ev/SKILL.md",
    phrase: "Claim one free lane as the reviewer and keep it out of the writing",
  },
  {
    source: "port team-ev: do not promote your own pass into the verdict",
    file: "team-ev/SKILL.md",
    phrase: "Do not promote your own pass into the verdict",
  },
  {
    source: "port team-ev: a writer lane gets its own worktree",
    file: "team-ev/SKILL.md",
    phrase: "git worktree add <path> -b <lane-branch> HEAD",
  },
  {
    source: "port team-ev: a slice passing alone is not evidence the merge works",
    file: "team-ev/SKILL.md",
    phrase: "A slice that passed in isolation is not evidence that the merge works",
  },
];

describe("port-local skill rules", () => {
  test("every pinned phrase is distinctive enough to pin a rule", () => {
    const phrases = rules.map((r) => r.phrase);
    expect(new Set(phrases).size).toBe(phrases.length);
    for (const phrase of phrases) expect(phrase.length).toBeGreaterThanOrEqual(20);
  });

  for (const { source, file, phrase } of rules) {
    test(`${file} keeps the rule from ${source}`, () => {
      expect(readFileSync(join(skillsDir, file), "utf8")).toContain(phrase);
    });
  }
});
