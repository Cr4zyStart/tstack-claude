// CLI regressions against installed Pi, with no model calls or credentials.
import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { AgentRunner } from "../../plugins/tstack/pi/agents.ts";
import { findPiPackage } from "../../tools/pi-package.mjs";
import { useWorld } from "./harness.mjs";

// FIX [Claude AI - Opus 5] (2026-10-10 06:52:19): bun defaults to 5 s. A git
// or spawn fixture on Windows routinely needs longer, and a suite whose files
// disagree about the clock produces reds that move between runs.
setDefaultTimeout(30_000);

const piDir = findPiPackage();
const noNode = spawnSync("node", ["--version"]).status !== 0;
const setup = useWorld();
if (process.env.TSTACK_PI_REQUIRE_RUNTIME === "1" && (!piDir || noNode)) throw new Error("The Pi runtime tests require an installed Pi package and node.");

describe.skipIf(!piDir || noNode)("installed Pi child startup", () => {
  for (const [isolation, installed] of [[undefined, false], ["worktree", false], ["worktree", true]]) {
    test(`loads tstack once, isolation=${isolation}, globally installed=${installed}`, async () => {
      const { w, pi, ctx } = setup({ ctx: { model: null } });
      if (installed) writeFileSync(join(w.agentDir, "settings.json"), JSON.stringify({ packages: [join(import.meta.dir, "../..")] }));
      execFileSync("git", ["init", "-b", "main", w.cwd], { stdio: "ignore" });
      execFileSync("git", ["-C", w.cwd, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "--allow-empty", "-m", "base"], { stdio: "ignore" });
      // Isolate Pi's configuration without modifying the test runner's environment.
      const config = join(w.agentDir, "environment.mjs");
      writeFileSync(config, `process.env.PI_CODING_AGENT_DIR = ${JSON.stringify(w.agentDir)};`);
      const runner = new AgentRunner(pi.api, {
        ...w.settings,
        pi: { command: "node", args: ["--import", config, join(piDir, "dist/cli.js")] },
      });
      try {
        // /loop without arguments only prints usage. A handled command proves
        // tstack loaded, without starting a model run in the child.
        const started = runner.start({ description: "startup probe", prompt: "/loop", isolation }, ctx);
        const result = await runner.wait(started.agent.id);
        expect(result.finalText).toContain("consumed the prompt as an extension command");
        expect(result.exitCode).toBe(0);
      } finally {
        await runner.stopAll();
      }
    }, 15000);
  }
});
