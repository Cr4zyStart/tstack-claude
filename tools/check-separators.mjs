#!/usr/bin/env node
// ADD [Claude AI - Opus 5] (2026-10-10 05:34:12): six separator bugs shipped
// before anyone looked for the seventh, every one found by accident. Ten were
// a bare relative() whose result went into a message, a Set key or a
// forward-slash comparison. posixRel exists for that; this refuses the bare
// call so the eleventh cannot reach main.
//
// Only relative() is checked. A consumer-side rule (a slash literal handed to
// endsWith or split) would flag 19 correct sites in this tree on the day it
// landed, and a lint that fires on correct code gets switched off.
import { readFileSync, realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { walk } from "./validate-skills.mjs";

const SOURCE = /\.(mjs|cjs|js|mts|ts)$/;
const CALL = /(?<![\w$.])relative\s*\(/g;
// The two spellings of folding on the spot. The Pi extension cannot import
// toPosix from tools/, so it writes the fold by hand, and that is fine.
const WRAPPED = /toPosix\s*\(\s*$/;
const FOLDED = /^\s*\.split\(\s*(["'])\\\\\1\s*\)\s*\.join\(\s*(["'])\/\2\s*\)/;
const ALLOW = /native-path:\s*\S/;

// Blank comments and string text, keeping a `${...}` interpolation as the code
// it is. Interpolations must survive: every message site this lint exists to
// catch is a relative() call inside a template, and a version that blanked
// them passed three real ones in a historical tree.
//
// This works one line at a time, on purpose. A whole-file scanner has to guess
// whether `/` opens a regex or divides, and when it guesses wrong it blanks the
// rest of the file and reports clean. Measured on the tree before 96f6ee8,
// that version found one of three violations and said nothing about the other
// two. A per-line pass cannot desynchronize past a newline, so its mistakes
// are false positives, which are loud, rather than silence, which is not.
// Offsets are preserved so the caller can read the untouched line.
export function codeOnly(line) {
  let out = "";
  let i = 0;
  const skip = (count) => {
    const stop = Math.min(line.length, i + count);
    out += " ".repeat(stop - i);
    i = stop;
  };
  while (i < line.length) {
    const two = line.slice(i, i + 2);
    if (two === "//") {
      skip(line.length - i);
      break;
    }
    if (two === "/*") {
      const end = line.indexOf("*/", i + 2);
      skip((end === -1 ? line.length : end + 2) - i);
      continue;
    }
    const quote = line[i];
    if (quote !== '"' && quote !== "'" && quote !== "`") {
      out += line[i++];
      continue;
    }
    skip(1);
    while (i < line.length) {
      if (line[i] === "\\") {
        skip(2);
        continue;
      }
      if (line[i] === quote) {
        skip(1);
        break;
      }
      if (quote === "`" && line[i] === "$" && line[i + 1] === "{") {
        skip(2);
        let depth = 1;
        while (i < line.length) {
          if (line[i] === "{") depth++;
          else if (line[i] === "}" && --depth === 0) {
            skip(1);
            break;
          }
          out += line[i++];
        }
        continue;
      }
      skip(1);
    }
  }
  return out;
}

function closes(code, open) {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === "(") depth++;
    else if (code[i] === ")" && --depth === 0) return i;
  }
  return -1;
}

export function checkSeparators(root) {
  const problems = [];
  for (const file of walk(root).filter((path) => SOURCE.test(path))) {
    const text = readFileSync(file, "utf8");
    if (!text.includes("relative")) continue;
    const lines = text.split("\n");
    lines.forEach((line, index) => {
      const code = codeOnly(line);
      for (const match of code.matchAll(CALL)) {
        if (WRAPPED.test(code.slice(0, match.index))) continue;
        const end = closes(code, match.index + match[0].length - 1);
        if (end !== -1 && FOLDED.test(line.slice(end + 1))) continue;
        if ([line, lines[index - 1]].some((near) => near !== undefined && ALLOW.test(near))) continue;
        const rel = file.startsWith(`${root}/`) ? file.slice(root.length + 1) : file;
        problems.push(
          `${rel}:${index + 1}: bare relative() returns native separators. Use posixRel, fold it with toPosix, or say why in a "native-path: <reason>" comment on the line or above it.`,
        );
      }
    });
  }
  return problems;
}

function invokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return fileURLToPath(import.meta.url) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  const root = resolve(process.argv[2] ?? ".").split("\\").join("/");
  if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) {
    console.error(`${root} is not a directory`);
    process.exitCode = 1;
  } else {
    const problems = checkSeparators(root);
    if (problems.length > 0) {
      console.error(problems.join("\n"));
      process.exitCode = 1;
    } else {
      console.log("No bare relative() calls: every path that becomes a string is posix.");
    }
  }
}
