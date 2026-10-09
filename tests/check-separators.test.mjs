import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkSeparators, codeOnly } from "../tools/check-separators.mjs";

setDefaultTimeout(30_000);

const B = String.fromCharCode(92);

function check(files) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "tstack-separators-")));
  try {
    for (const [name, text] of Object.entries(files)) {
      mkdirSync(join(root, name, ".."), { recursive: true });
      writeFileSync(join(root, name), text);
    }
    return checkSeparators(root.split(B).join("/"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("separator lint", () => {
  test("a bare call is reported with its file and line", () => {
    expect(check({ "a.mjs": "const x = 1;\nmsg(relative(root, file));\n" })).toEqual([
      expect.stringContaining("a.mjs:2: bare relative()"),
    ]);
  });

  test("a call inside a template interpolation is reported", () => {
    // The defect that made the first version of this lint worthless: every
    // message site is an interpolation, and blanking template bodies hid them.
    expect(check({ "a.mjs": ["problems.push(`${relative(root, file)}: bad`);"].join("\n") })).toEqual([
      expect.stringContaining("a.mjs:1:"),
    ]);
  });

  test("a call is still found after a regex literal holding a quote", () => {
    // A whole-file scanner read that regex as an opening string and reported
    // the rest of the file clean.
    const src = ["const q = /['\"]/;", "msg(relative(root, file));"].join("\n");
    expect(check({ "a.mjs": src })).toEqual([expect.stringContaining("a.mjs:2:")]);
  });

  test("posixRel, a toPosix wrap, and a hand-written fold are all accepted", () => {
    const fold = `.split("${B}${B}").join("/")`;
    const src = [
      "const a = posixRel(root, file);",
      "const b = toPosix(relative(root, file));",
      `const c = relative(root, file)${fold};`,
    ].join("\n");
    expect(check({ "a.mjs": src })).toEqual([]);
  });

  test("relative in a comment or a string is not a call", () => {
    const src = ['// relative(root, file) is what this used to do', 'const s = "relative(a, b)";'].join("\n");
    expect(check({ "a.mjs": src })).toEqual([]);
  });

  test("a native-path reason silences the line, on it or above it", () => {
    const src = [
      "// native-path: tests a .. prefix against sep.",
      "const a = relative(root, file);",
      "const b = relative(root, file); // native-path: same.",
    ].join("\n");
    expect(check({ "a.mjs": src })).toEqual([]);
  });

  test("a native-path marker with no reason does not silence anything", () => {
    expect(check({ "a.mjs": "const a = relative(root, file); // native-path:\n" })).toEqual([
      expect.stringContaining("a.mjs:1:"),
    ]);
  });

  test("a longer identifier ending in relative is not a call", () => {
    expect(check({ "a.mjs": "const a = makeRelative(root, file);\nconst b = p.relative(root, file);\n" })).toEqual([]);
  });

  test("files that are not sources are left alone", () => {
    expect(check({ "a.md": "msg(relative(root, file));\n", "b.json": '"relative(a, b)"' })).toEqual([]);
  });

  test("every violation in a file is reported, not just the first", () => {
    const src = ["msg(relative(a, b));", "const x = 1;", "msg(relative(c, d));"].join("\n");
    expect(check({ "a.mjs": src })).toHaveLength(2);
  });

  test("codeOnly keeps offsets so the caller can read the untouched line", () => {
    const line = 'const s = "hidden"; // trailing';
    expect(codeOnly(line)).toHaveLength(line.length);
    expect(codeOnly(line).trimEnd()).toBe('const s =         ;');
  });
});
