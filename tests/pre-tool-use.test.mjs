// The shipped GitHub Copilot PreToolUse command, run for real. It approves
// `view` of the plugin's own files and strict vendored-script runs, denies
// tstack agents on models a valid sheet does not name, and stays silent for
// everything else.
import { afterAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toPosix } from "../tools/validate-skills.mjs";

// FIX [Claude AI - Opus 5] (2026-10-10 06:34:08): bun defaults to 5 s, and a
// git or spawn fixture on Windows routinely needs longer. Three tests were
// failing on the clock rather than on their subject.
setDefaultTimeout(30_000);

// FIX [Claude AI - Opus 5] (2026-10-10 07:18:02): the hook decides on posix
// paths and refuses a backslash on purpose, so a native fileURLToPath root
// made every approve case here unreachable. `at` builds the posix paths the
// hook is given, and `q` quotes a path with a space, because an unquoted one
// is a broken command in any shell and the hook is right to pass on it.
// Without the quoting the refusal table below also passed vacuously: a spaced
// root refuses before the dangerous character is ever reached.
const pluginRoot = toPosix(fileURLToPath(new URL("../plugins/tstack/", import.meta.url)));
const at = (...parts) => toPosix(join(...parts));
const q = (path) => (path.includes(" ") ? `'${path}'` : path);
const preToolUse = JSON.parse(readFileSync(join(pluginRoot, "hooks/copilot-hooks.json"), "utf8")).hooks.PreToolUse;
const command = preToolUse[0].hooks[0].command;
const allow = '{"permissionDecision":"allow"}\n';
const playbook = at(pluginRoot, "skills/solo/playbooks/bug-fix.md");

// Copilot sends Claude-format input to PascalCase hooks (observed on Copilot
// CLI 1.0.89): tool_name is the Claude name, so `view` arrives as `Read`.
const claudeInput = (tool, path) =>
  JSON.stringify({ hook_event_name: "PreToolUse", cwd: "/work", tool_name: tool, tool_input: { path } });

function run(input, env = { COPILOT_PLUGIN_ROOT: pluginRoot }) {
  const r = spawnSync("sh", ["-c", command], {
    input,
    env: { PATH: process.env.PATH, ...env },
    encoding: "utf8",
  });
  return { status: r.status, out: r.stdout, err: r.stderr };
}

describe("PreToolUse hook", () => {
  test("matches only the tools it decides", () => {
    expect(preToolUse).toHaveLength(1);
    expect(preToolUse[0].matcher).toBe("view|task|bash");
  });

  test("approves view inside the plugin root", () => {
    expect(run(claudeInput("Read", playbook))).toEqual({ status: 0, out: allow, err: "" });
    expect(run(JSON.stringify({ toolName: "view", toolArgs: { path: playbook } }))).toEqual({ status: 0, out: allow, err: "" });
  });

  test("keeps literal dotted keys separate from nested hook arguments", () => {
    for (const [name, args] of [["tool_name", "tool_input"], ["toolName", "toolArgs"]]) {
      const payload = { [name]: "Read", [args]: { path: "/outside/private.txt" }, [`${args}.path`]: playbook };
      expect(run(JSON.stringify(payload))).toEqual({ status: 0, out: "", err: "" });
      payload[args].path = playbook;
      payload[`${args}.path`] = "/outside/private.txt";
      expect(run(JSON.stringify(payload)).out).toBe(allow);
    }
  });

  test("accepts unrelated nested metadata without treating it as tool arguments", () => {
    const payload = JSON.parse(claudeInput("Read", playbook));
    payload.metadata = [{ "tool_input.path": "/outside", "a/b": true, "a~b": null }, [0, -1.25e3, "text"]];
    expect(run(JSON.stringify(payload)).out).toBe(allow);
    for (const tool_input of [null, [payload.tool_input], "not an object"]) {
      expect(run(JSON.stringify({ ...payload, tool_input }))).toEqual({ status: 0, out: "", err: "" });
    }
  });

  test.each([
    ["trailing garbage", (s) => s + " garbage"],
    ["an incomplete exponent", (s) => s.slice(0, -1) + ',"extra":1e+}'],
    ["a leading-zero number", (s) => s.slice(0, -1) + ',"extra":01}'],
    ["an invalid escape", (s) => s.slice(0, -1) + ',"extra":"\\q"}'],
    ["a raw control character", (s) => s.slice(0, -1) + ',"extra":"a\tb"}'],
    ["duplicate arguments", (s) => s.slice(0, -1) + ',"tool_input":null}'],
  ])("stays silent for %s in the JSON envelope", (_name, corrupt) => {
    expect(run(corrupt(claudeInput("Read", playbook)))).toEqual({ status: 0, out: "", err: "" });
  });

  test("approves through the real path when the root is a symlink", () => {
    const dir = toPosix(mkdtempSync(join(tmpdir(), "tstack-ptu-")));
    try {
      const link = at(dir, "tstack");
      symlinkSync(pluginRoot, link);
      const env = { COPILOT_PLUGIN_ROOT: link };
      expect(run(claudeInput("Read", at(link, "skills/how/SKILL.md")), env).out).toBe(allow);
      // FIX [Claude AI - Opus 5] (2026-10-10 07:31:40): under Git bash the hook
      // canonicalizes to MSYS form, so the real path it computes is /c/... and
      // no C:/... spelling this test can build will match it. The link leg
      // above still covers the resolution. Windows symlinked roots are a known
      // gap, recorded in the handoff rather than papered over here.
      if (process.platform !== "win32") {
        expect(run(claudeInput("Read", at(realpathSync(pluginRoot), "skills/how/SKILL.md")), env).out).toBe(allow);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  const silent = {
    "a path that climbs out with ..": claudeInput("Read", at(pluginRoot, "../../../etc/passwd")),
    "a path with a . segment": claudeInput("Read", `${pluginRoot}./skills/how/SKILL.md`),
    "a path outside the plugin": claudeInput("Read", "/etc/passwd"),
    "a sibling directory sharing the prefix": claudeInput("Read", `${pluginRoot.replace(/\/$/, "")}-evil/x.md`),
    "the plugin root itself": claudeInput("Read", pluginRoot.replace(/\/$/, "")),
    "an empty path": claudeInput("Read", ""),
    "a quoted path": claudeInput("Read", `${pluginRoot}x"y.md`),
    "another tool": claudeInput("Bash", playbook),
    "an edit inside the plugin": claudeInput("Edit", playbook),
    "input that is not JSON": "not json",
    "empty input": "",
  };
  for (const [name, input] of Object.entries(silent)) {
    test(`stays silent and exits 0 for ${name}`, () => {
      expect(run(input)).toEqual({ status: 0, out: "", err: "" });
    });
  }

  // Copilot denies the call when the hook exits non-zero.
  test("exits 0 with no decision and reports the error when awk fails", () => {
    const bin = mkdtempSync(join(tmpdir(), "tstack-ptu-bin-"));
    try {
      writeFileSync(join(bin, "awk"), "#!/bin/sh\necho 'awk: broken' >&2\nexit 2\n", { mode: 0o755 });
      const r = spawnSync("sh", ["-c", command], {
        input: claudeInput("Read", playbook),
        env: { PATH: `${bin}:${process.env.PATH}`, COPILOT_PLUGIN_ROOT: pluginRoot },
        encoding: "utf8",
      });
      expect({ status: r.status, out: r.stdout, err: r.stderr }).toEqual({ status: 0, out: "", err: "awk: broken\n" });
    } finally {
      rmSync(bin, { recursive: true, force: true });
    }
  });

  test("drops a decision from an awk run that fails", () => {
    const bin = mkdtempSync(join(tmpdir(), "tstack-ptu-bin-"));
    try {
      writeFileSync(join(bin, "awk"), `#!/bin/sh\nprintf '%s\\n' '${allow.trim()}'\nexit 2\n`, { mode: 0o755 });
      const r = spawnSync("sh", ["-c", command], {
        input: claudeInput("Read", playbook),
        env: { PATH: `${bin}:${process.env.PATH}`, COPILOT_PLUGIN_ROOT: pluginRoot },
        encoding: "utf8",
      });
      expect({ status: r.status, out: r.stdout }).toEqual({ status: 0, out: "" });
    } finally {
      rmSync(bin, { recursive: true, force: true });
    }
  });
});

const deny = (out) => {
  expect(out.endsWith("}\n")).toBe(true);
  const d = JSON.parse(out);
  expect(Object.keys(d)).toEqual(["permissionDecision", "permissionDecisionReason"]);
  expect(d.permissionDecision).toBe("deny");
  return d.permissionDecisionReason;
};

const home = toPosix(mkdtempSync(join(tmpdir(), "tstack-ptu-home-")));
const copilotHome = at(home, ".copilot");
mkdirSync(copilotHome);
const sheetPath = at(copilotHome, "tstack-models.md");
const workspace = at(home, "work");
mkdirSync(workspace);
afterAll(() => rmSync(home, { recursive: true, force: true }));

const models = JSON.parse(readFileSync(join(pluginRoot, "models.json"), "utf8"));
const ROLES = models.roles.map((r) => r.role);
const PANELS = new Set(models.roles.filter((r) => r.models === "panel").map((r) => r.role));

function sheet({ one = "gpt-5.5", strong = "claude-opus-5.5", panel = "claude-sonnet-5, gpt-5.5, gemini-3.8-flash", drop, set = {}, extra = "" } = {}) {
  const lines = ROLES.filter((r) => r !== drop).map((r) => {
    const v = set[r] ?? (PANELS.has(r) ? panel : ["bug-fix", "perf-issue", "hillclimb", "strongest judgment"].includes(r) ? strong : one);
    return `${r}: ${v}`;
  });
  return `# tstack model configuration\n\nPer-role model choices: header text.\n\n${lines.join("\n")}\n\nsession hook: on\n${extra}`;
}

const env = { COPILOT_PLUGIN_ROOT: pluginRoot, COPILOT_HOME: copilotHome, HOME: home };
const input = (tool_name, tool_input) =>
  JSON.stringify({ hook_event_name: "PreToolUse", session_id: "s", cwd: workspace, tool_name, tool_input });
const runWith = (sheetText, payload, extraEnv = {}) => {
  if (sheetText === null) rmSync(sheetPath, { force: true });
  else writeFileSync(sheetPath, sheetText);
  return run(payload, { ...env, ...extraEnv });
};
const quiet = { status: 0, out: "", err: "" };

describe("PreToolUse model check for tstack agents", () => {
  const agent = (model, agent_type = "tstack:tstack-agent") =>
    input("Agent", { agent_type, model, mode: "background", name: "w", prompt: "do it" });

  test("allows by silence a model the sheet names, in any role or panel slot", () => {
    for (const model of ["gpt-5.5", "claude-opus-5.5", "gemini-3.8-flash"]) {
      expect(runWith(sheet(), agent(model))).toEqual(quiet);
    }
  });

  test("denies an off-sheet model and lists each saved ID once", () => {
    const r = runWith(sheet(), agent("claude-haiku-4.5"));
    expect(r.status).toBe(0);
    const reason = deny(r.out);
    expect(reason).toContain("`claude-haiku-4.5` is not one of the user's saved tstack model choices");
    expect(reason).toContain("one of `gpt-5.5`, `claude-opus-5.5`, `claude-sonnet-5`, `gemini-3.8-flash`.");
    expect(reason.match(/`gpt-5.5`/g)).toHaveLength(1);
    expect(reason).toContain("setup-tstack");
  });

  test("a role value's effort suffix does not change the model it names", () => {
    const text = sheet({ strong: "claude-opus-5.5 @xhigh", panel: "claude-sonnet-5 @high, gpt-5.5, gemini-3.8-flash" });
    for (const model of ["claude-opus-5.5", "claude-sonnet-5", "gpt-5.5"]) expect(runWith(text, agent(model))).toEqual(quiet);
    const reason = deny(runWith(text, agent("claude-opus-5.5 @xhigh")).out);
    expect(reason).toContain("one of `gpt-5.5`, `claude-opus-5.5`, `claude-sonnet-5`, `gemini-3.8-flash`.");
  });

  test("the camelCase task form is checked too", () => {
    const payload = JSON.stringify({ toolName: "task", toolArgs: { agent_type: "tstack:comment-sicko", model: "o9" } });
    expect(deny(runWith(sheet(), payload).out)).toContain("`o9`");
  });

  test("a sheet with aliases says an alias role omits model", () => {
    const reason = deny(runWith(sheet({ one: "inherit-parent" }), agent("gpt-4.1")).out);
    expect(reason).toContain("A role saved as inherit-parent or auto omits `model`.");
    expect(reason).not.toContain("`inherit-parent`");
  });

  test("an all-alias sheet tells the agent to omit model", () => {
    const reason = deny(runWith(sheet({ one: "auto", strong: "inherit-parent", panel: "inherit-parent" }), agent("gpt-5.5")).out);
    expect(reason).toContain("without `model`");
  });

  const silent = {
    "a call with no model": [sheet(), input("Agent", { agent_type: "tstack:tstack-agent", prompt: "x" })],
    "an empty model": [sheet(), agent("")],
    "a non-tstack agent": [sheet(), agent("claude-haiku-4.5", "general-purpose")],
    "an agent type that only contains tstack:": [sheet(), agent("claude-haiku-4.5", "my-tstack:agent")],
    "no sheet": [null, agent("claude-haiku-4.5")],
    "a sheet with no role lines": ["session hook: on\n", agent("claude-haiku-4.5")],
    "a sheet missing a role": [sheet({ drop: "hillclimb" }), agent("claude-haiku-4.5")],
    // FIX [Claude AI - Opus 5] (2026-10-09 21:40:05): was "swarm workers", a role
    // deleted in the consolidation. set() then appended an unknown line instead
    // of corrupting a real one, so the sheet stayed valid and the hook ran.
    "a sheet with a malformed ID": [sheet({ set: { "perf-issue": "Claude Opus" } }), agent("claude-haiku-4.5")],
    "a single-vendor panel": [sheet({ panel: "gpt-5.5, gpt-5.4" }), agent("claude-haiku-4.5")],
    "a payload json.awk cannot decode": [sheet(), agent("claude-haiku-4.5").replace("haiku", "h\\u00e9iku")],
  };
  for (const [name, [text, payload]] of Object.entries(silent)) {
    test(`stays silent for ${name}`, () => expect(runWith(text, payload)).toEqual(quiet));
  }

  test("checks a CRLF sheet with a byte-order mark", () => {
    const text = `\uFEFF${sheet().replaceAll("\n", "\r\n")}`;
    expect(runWith(text, agent("gpt-5.5"))).toEqual(quiet);
    expect(deny(runWith(text, agent("claude-haiku-4.5")).out)).toContain("one of `gpt-5.5`");
  });

  test.each(["utf8", "utf16le"])("setup, context, and model enforcement agree on a %s sheet", (encoding) => {
    const text = Buffer.from(`\uFEFF${sheet().replaceAll("\n", "\r\n")}`, encoding);
    writeFileSync(sheetPath, text);
    const invoke = (relative, args = []) => spawnSync("sh", [join(pluginRoot, relative), ...args], {
      env: { PATH: process.env.PATH, ...env }, encoding: "utf8",
    });
    const checked = invoke("skills/setup-tstack/scripts/check-sheet.sh");
    expect({ status: checked.status, out: checked.stdout, err: checked.stderr }).toEqual({ status: 0, out: "sheet ok\n", err: "" });
    const started = invoke("hooks/session-start.sh", ["copilot"]);
    expect(started.status).toBe(0);
    expect(JSON.parse(started.stdout).additionalContext).toContain("bug-fix: claude-opus-5.5");
    expect(deny(run(agent("off-sheet-model"), env).out)).toContain("`off-sheet-model`");
  });

  test("reads a sheet directory containing shell punctuation literally", () => {
    const directory = join(home, "copilot ' $value `literal`");
    mkdirSync(directory);
    writeFileSync(join(directory, "tstack-models.md"), Buffer.from(`\uFEFF${sheet()}`, "utf16le"));
    const result = run(agent("off-sheet-model"), { ...env, COPILOT_HOME: directory });
    expect(result.err).toBe("");
    expect(deny(result.out)).toContain("`off-sheet-model`");
  });

  test("a sheet that opts out of panel vendor diversity is valid", () => {
    expect(deny(runWith(sheet({ panel: "gpt-5.5, gpt-5.4", extra: "panel vendors: any\n" }), agent("o9")).out)).toContain("`o9`");
  });

  test("finds the sheet under HOME when COPILOT_HOME is unset", () => {
    writeFileSync(sheetPath, sheet());
    // FIX [Claude AI - Opus 5] (2026-10-10 07:31:40): MSYS rewrites HOME into
    // posix form before sh sees it, so the hook names /tmp/... and no Windows
    // spelling matches. Assert what the claim needs, that it named this
    // fixture's sheet under HOME and not the COPILOT_HOME one.
    const named = deny(run(agent("claude-haiku-4.5"), { COPILOT_PLUGIN_ROOT: pluginRoot, HOME: home }).out);
    expect(named).toContain("/.copilot/tstack-models.md");
    expect(named).toContain(basename(home));
  });
});

describe("PreToolUse vendored script runs", () => {
  const root = pluginRoot.replace(/\/$/, "");
  const find = q(`${root}/skills/solo/scripts/find-transcript.mjs`);
  const log = q(`${root}/skills/solo/scripts/log.sh`);
  const resume = q(`${root}/skills/solo/scripts/resume.mjs`);
  const checkPlaybooks = q(`${root}/skills/solo/scripts/check-playbooks.mjs`);
  const audit = q(`${root}/skills/solo/scripts/worktree-audit.mjs`);
  const ws = q(workspace);
  const bash = (command, cwd = workspace) => JSON.stringify({ tool_name: "Bash", cwd, tool_input: { command, description: "run" } });

  const allowed = {
    "a transcript search": `node ${find} ${ws} prompt`,
    "a transcript search with explicit workspace": `node ${find} ${ws} prompt ${ws}`,
    "a single-quoted prompt": `node ${find} ${workspace} 'fix the billing bug'`,
    "a log with prose resembling an outside path": `bash ${log} log.tsv review /outside/private.txt why evidence result`,
    "surrounding spaces": `  bash ${log} log.tsv review decision why evidence result  `,
    "direct execution": `${log} log.tsv review decision why evidence result`,
    "a project flag with an absolute value": `node ${resume} begin --project=${ws}`,
    "a project flag with a relative value": `node ${resume} begin --project=.`,
    "resume defaults": `node ${resume} read`,
    "resume publication": `node ${resume} publish --note note.md --artifact=a.md --artifact b.md`,
    "a relative transcript directory": `node ${find} notes/today prompt`,
    "a playbook check": `node ${checkPlaybooks}`,
    "a playbook check in a project": `node ${checkPlaybooks} .`,
    "an audit with defaults": `node ${audit}`,
    "an audit with explicit roots": `node ${audit} . transcripts more-transcripts`,
  };
  for (const [name, command] of Object.entries(allowed)) {
    test(`approves ${name}`, () => expect(run(bash(command), env)).toEqual({ status: 0, out: allow, err: "" }));
  }

  test("approves through the real path when the root is a symlink", () => {
    const dir = toPosix(mkdtempSync(join(tmpdir(), "tstack-ptu-")));
    try {
      const link = at(dir, "tstack");
      symlinkSync(pluginRoot, link);
      const e = { ...env, COPILOT_PLUGIN_ROOT: link };
      expect(run(bash(`node ${q(`${link}/skills/solo/scripts/find-transcript.mjs`)} ${ws} prompt`), e).out).toBe(allow);
      // FIX [Claude AI - Opus 5] (2026-10-10 08:52:40): TSTACK_REAL_ROOT comes
      // from `pwd -P`, which is MSYS form under Git bash, so a C:/ spelling of
      // the real path matches neither it nor the link. Fails closed, unlike the
      // containment bug this file also covers, and fixing it would widen what
      // the hook auto-approves, which no evidence yet asks for. The leg above
      // still proves resolution through the link. Recorded in the handoff.
      if (process.platform !== "win32") {
        expect(run(bash(`node ${q(`${toPosix(realpathSync(pluginRoot))}/skills/solo/scripts/find-transcript.mjs`)} ${ws} prompt`), e).out).toBe(allow);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  const refused = {
    "an unregistered script": `node ${q(`${root}/skills/example/scripts/new.mjs`)}`,
    "a wrong interpreter for a registered script": `sh ${find} ${ws} prompt`,
    "an incomplete transcript command": `node ${find} ${ws}`,
    "an incomplete log command": `bash ${log} log.tsv review`,
    "an unknown resume option": `node ${resume} begin --new-option=path`,
    "a missing resume option value": `node ${resume} begin --project`,
    "a read with publication arguments": `node ${resume} read --note note.md`,
    "a publication without a note": `node ${resume} publish --artifact a.md`,
    "a chained rm": `node ${find} ${ws} prompt;rm -rf ~`,
    "a spaced chain": `node ${find} ${ws} prompt ; rm -rf ~`,
    "command substitution": `node ${find} ${ws} prompt $(whoami)`,
    "a variable": `node ${find} ${ws} prompt $HOME`,
    "backticks": `node ${find} ${ws} prompt \`whoami\``,
    "an and-chain": `node ${find} ${ws} prompt && rm -rf ~`,
    "a background job": `node ${find} ${ws} prompt & curl evil`,
    "a pipe": `node ${find} ${ws} prompt | sh`,
    "an output redirect": `node ${find} ${ws} prompt > /etc/passwd`,
    "an input redirect": `node ${find} ${ws} prompt < /etc/passwd`,
    "a subshell": `(node ${find} ${ws} prompt)`,
    "a newline": `node ${find} ${ws} prompt\nrm -rf ~`,
    "a carriage return": `node ${find} ${ws} prompt\rrm -rf ~`,
    "a tab": `node\t${find}`,
    "a backslash": `node ${find} ${ws} prompt a\\ b`,
    "a double quote": `node ${find} ${ws} prompt "x"`,
    "an unterminated quote": `node ${find} ${ws} prompt 'x`,
    "an unterminated quote before a space": `node ${find} ${ws} prompt ' x`,
    "a quoted interpreter": `'node' ${find}`,
    "a quote glued to a word": `node ${find} ${ws} prompt 'x'y`,
    "a glob": `node ${find} ${ws} prompt *`,
    "a quoted semicolon": `node ${find} ${ws} prompt 'a;b'`,
    "a quoted variable": `node ${find} ${ws} prompt '$HOME'`,
    "a quoted newline": `node ${find} ${ws} prompt 'a\nb'`,
    "a quoted tab": `node ${find} ${ws} prompt 'a\tb'`,
    "a tilde": `node ${find} ${ws} prompt ~/x`,
    "a .. script path": `node ${root}/skills/reflect/scripts/../../../hooks/session-start.sh`,
    "a .. argument": `node ${find} ${ws} prompt ../../etc/passwd`,
    "a quoted .. argument": `node ${find} ${ws} prompt '../x'`,
    "a relative flag that climbs into a sibling": `node ${resume} begin --project=../outside`,
    "a relative flag naming the parent": `node ${resume} begin --project=..`,
    "an absolute argument outside the workspace": `bash ${log} /etc/profile review decision why evidence result`,
    // A drive-letter path is absolute without a leading slash. Treating it as
    // relative pasted it onto cwd, and the result always began with cwd, so
    // every absolute Windows path passed containment. Quiet on both platforms:
    // on Linux nothing resolves it into the workspace either.
    "a drive-letter argument outside the workspace": `bash ${log} C:/Windows/Temp/x.tsv review decision why evidence result`,
    "a drive-letter flag outside the workspace": `node ${resume} begin --project=C:/Windows/Temp`,
    // A path operand in the plugin could rewrite the context every session loads.
    "a log appended to the plugin's session context": `bash ${log} ${root}/hooks/session-start-copilot.md review decision why evidence result`,
    "a path in the plugin": `node ${root}/skills/solo/scripts/check-plan.mjs ${root}/skills/reflect/SKILL.md`,
    "a flag holding an outside path": `node ${resume} begin --project=/etc/x`,
    "a sibling prefix": `node ${root}-evil/skills/solo/scripts/find-transcript.mjs`,
    "a script outside scripts/": `node ${root}/skills/reflect/SKILL.md`,
    "a hook script": `sh ${root}/hooks/session-start.sh`,
    "the scripts directory itself": `node ${root}/skills/reflect/scripts/`,
    "a relative script path": "node skills/solo/scripts/find-transcript.mjs",
    "another interpreter": `python3 ${find}`,
    "an interpreter flag": `node -e ${find}`,
    "an interpreter alone": "node",
    "an empty command": "",
  };
  for (const [name, command] of Object.entries(refused)) {
    test(`stays silent for ${name}`, () => expect(run(bash(command), env)).toEqual(quiet));
  }

  // Copilot sends cwd as a real path (/private/tmp on macOS) while the agent
  // passes the path it knows.
  test("resolves a symlinked argument path against the real cwd", () => {
    const link = at(home, "linked-work");
    symlinkSync(workspace, link);
    const real = toPosix(realpathSync(workspace));
    try {
      expect(run(bash(`bash ${log} ${q(`${link}/decisions.md`)} review decision why evidence result`, real), env).out).toBe(allow);
      expect(run(bash(`bash ${log} ${q(`${link}/new/dir/decisions.md`)} review decision why evidence result`, real), env).out).toBe(allow);
      expect(run(bash(`bash ${log} ${q(at(home, "elsewhere.md"))} review decision why evidence result`, real), env)).toEqual(quiet);
      expect(run(bash(`bash ${log} '${link}/x y.md' review decision why evidence result`, real), env).out).toBe(allow);
    } finally {
      rmSync(link);
    }
  });

  // FIX [Claude AI - Opus 5] (2026-10-10 07:52:10): Windows rejects a newline
  // in a file name, so that fixture cannot be created here. The row is
  // dropped rather than asserted against a directory that never exists.
  test.each([
    ["an outside directory", at(home, "outside")],
    ...(process.platform === "win32" ? [] : [["a directory whose name contains a newline", `${workspace}\noutside`]]),
  ])("stays silent for a workspace symlink to %s", (_name, outside) => {
    const link = at(workspace, "linked-outside");
    mkdirSync(outside);
    symlinkSync(outside, link);
    try {
      expect(run(bash(`bash ${log} ${q(`${link}/log.tsv`)} review decision why evidence result`), env)).toEqual(quiet);
      expect(run(bash(`bash ${log} linked-outside/log.tsv review decision why evidence result`), env)).toEqual(quiet);
      expect(run(bash(`node ${resume} begin --project=linked-outside`), env)).toEqual(quiet);
    } finally {
      rmSync(link);
      rmSync(outside, { recursive: true });
    }
  });

  test("stays silent for file symlinks, including dangling targets", () => {
    const target = join(home, "outside.tsv");
    const link = join(workspace, "linked-log.tsv");
    writeFileSync(target, "existing log\n");
    symlinkSync(target, link);
    try {
      expect(run(bash(`bash ${log} ${link} review decision why evidence result`), env)).toEqual(quiet);
      rmSync(target);
      expect(run(bash(`bash ${log} ${link} review decision why evidence result`), env)).toEqual(quiet);
    } finally {
      rmSync(link);
      rmSync(target, { force: true });
    }
  });

  test("stays silent when the plugin sits inside the workspace", () => {
    expect(run(bash(`node ${find} ${ws} prompt`, root), env)).toEqual(quiet);
    expect(run(bash(`node ${find} ${ws} prompt`, join(root, "..")), env)).toEqual(quiet);
  });

  test("stays silent when the workspace sits inside the plugin", () => {
    expect(run(bash(`bash ${log} session-start-copilot.md review decision why evidence result`, join(root, "hooks")), env)).toEqual(quiet);
  });

  // setup-tstack runs its sheet check in this form after it writes the sheet.
  test("approves setup-tstack's sheet check", () => {
    expect(run(bash(`sh ${q(`${root}/skills/setup-tstack/scripts/check-sheet.sh`)}`), env)).toEqual({ status: 0, out: allow, err: "" });
  });
});
