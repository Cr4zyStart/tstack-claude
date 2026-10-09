// A bare `bun test` at the repository root must load the same files as CI's
// `bun test tests/`. The vendored solo scripts import packages that
// only their own `bun install` provides, so loading them from the root fails
// until some earlier run has installed them.
import { expect, setDefaultTimeout, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// FIX [Claude AI - Opus 5] (2026-10-10 06:52:19): bun defaults to 5 s. A git
// or spawn fixture on Windows routinely needs longer, and a suite whose files
// disagree about the clock produces reds that move between runs.
setDefaultTimeout(30_000);

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function loadedFiles(...paths) {
  const result = spawnSync(process.execPath, ["test", "--test-name-pattern", "^tstack-no-such-test$", ...paths], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const output = result.stdout + result.stderr;
  expect(result.status, output).toBe(0);
  return Number(output.match(/across (\d+) files?/)?.[1]);
}

test("a bare bun test at the root loads the same files as bun test tests/", () => {
  expect(loadedFiles()).toBe(loadedFiles("tests/"));
});
