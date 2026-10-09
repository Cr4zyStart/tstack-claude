// The release gate: shipped content must be covered by a VERSION bump, or it
// is inert on every installed copy. Covers the decision itself and the one
// workflow setting that would make the job pass without checking anything.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { SHIPPED, releaseGap } from "../tools/check-version-bump.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const CONTENT = "a".repeat(40);
const BUMP = "b".repeat(40);
const never = () => false;

describe("release gap", () => {
  test("a tree where nothing ships yet is not a gap", () => {
    expect(releaseGap("", BUMP, never)).toBeNull();
  });

  test("one commit that changes content and bumps VERSION is not a gap", () => {
    expect(releaseGap(CONTENT, CONTENT, never)).toBeNull();
  });

  test("a later release commit closes the gap, which is what CONTRIBUTING allows", () => {
    expect(releaseGap(CONTENT, BUMP, (a, b) => a === CONTENT && b === BUMP)).toBeNull();
  });

  test("content after the last bump is a gap that names both commits and the remedy", () => {
    const gap = releaseGap(CONTENT, BUMP, never);
    expect(gap).toContain(CONTENT.slice(0, 7));
    expect(gap).toContain(BUMP.slice(0, 7));
    expect(gap).toContain("inert on every installed copy");
    expect(gap).toContain("CHANGES.md");
  });

  test("a VERSION file no commit touches is a gap, not a pass", () => {
    expect(releaseGap(CONTENT, "", never)).toContain("nothing releases");
  });

  test("the watched path is the directory an install copies, not the whole repo", () => {
    expect(SHIPPED).toBe("plugins/tstack");
  });
});

describe("the CI job that runs it", () => {
  const ci = readFileSync(join(repoRoot, ".github/workflows/ci.yml"), "utf8");

  test("ci.yml calls the script", () => {
    expect(ci).toContain("bun tools/check-version-bump.mjs");
  });

  // actions/checkout clones one commit deep by default. In a shallow clone
  // `git log -- <path>` reports the lone commit for every path, so both lookups
  // match and the check passes on shipped === version regardless. The script
  // refuses a shallow clone for that reason; this keeps the job off the refusal.
  test("the job checks out full history, so the script sees the commits it judges", () => {
    const start = ci.indexOf("release-gate:");
    expect(start).toBeGreaterThan(-1);
    const job = ci.slice(start, ci.indexOf("bun tools/check-version-bump.mjs"));
    expect(job).toContain("fetch-depth: 0");
  });
});
