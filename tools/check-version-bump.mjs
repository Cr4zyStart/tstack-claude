#!/usr/bin/env node

// CONTRIBUTING, Releasing: plugin auto-update installs by version number, so
// shipped content newer than the last VERSION bump is inert on every installed
// copy. Thirteen commits sat in that state without anyone noticing, which is
// why this is a check and not only a sentence in a document.
//
// It reads the tip state rather than one diff. That section allows a content
// change "followed by a release PR that does" the bump, so the question is not
// whether this diff bumped VERSION, it is whether the newest commit under
// SHIPPED is covered by the newest bump. A per-diff check would have failed
// every content commit that a later release legitimately covered.

import { execFileSync } from "node:child_process";

// The plugin directory is what an install copies. tools/ and tests/ do not
// ship, so changing them needs no release.
export const SHIPPED = "plugins/tstack";

// null when the tip is releasable, otherwise the reason it is not.
export function releaseGap(shipped, version, isAncestor) {
  if (!shipped) return null;
  if (!version) return `no commit touches VERSION, so nothing releases ${SHIPPED}.`;
  if (shipped === version) return null;
  if (isAncestor(shipped, version)) return null;
  return (
    `${SHIPPED} last changed in ${shipped.slice(0, 7)}, which the last VERSION bump ` +
    `(${version.slice(0, 7)}) does not include. That content is inert on every installed copy ` +
    `until a release covers it. Bump VERSION, add a CHANGES.md entry under a ` +
    `"## <version> - <title>" heading, and run bun tools/generate.mjs to stamp the manifests ` +
    `(CONTRIBUTING, Releasing).`
  );
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

const isAncestor = (a, b) => {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", a, b]);
    return true;
  } catch {
    return false;
  }
};

if (import.meta.main) {
  // A shallow clone holds one commit, and `git log -- <path>` reports that commit
  // for every path, so both lookups return the same SHA and the check passes on
  // shipped === version whatever actually shipped. Measured against a --depth 1
  // clone, where both lookups gave 84be6c5. Refuse rather than pass vacuously.
  if (git("rev-parse", "--is-shallow-repository") === "true") {
    console.error("shallow clone: this check needs full history, so set actions/checkout fetch-depth: 0");
    process.exit(2);
  }
  const shipped = git("log", "-1", "--format=%H", "--", SHIPPED);
  const version = git("log", "-1", "--format=%H", "--", "VERSION");
  const gap = releaseGap(shipped, version, isAncestor);
  if (gap) {
    console.error(`FAIL: ${gap}`);
    process.exit(1);
  }
  console.log(`ok: ${SHIPPED} at ${shipped.slice(0, 7)} is covered by the VERSION bump in ${version.slice(0, 7)}`);
}
