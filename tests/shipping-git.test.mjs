import { setDefaultTimeout, test } from 'bun:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// FIX [Claude AI - Opus 5] (2026-10-10 06:34:08): bun defaults to 5 s, and a
// git or spawn fixture on Windows routinely needs longer. Three tests were
// failing on the clock rather than on their subject.
setDefaultTimeout(30_000);

const mergeSafety = readFileSync(new URL('../plugins/tstack/skills/solo/references/merge-safety.md', import.meta.url), 'utf8');
const recipe = [...mergeSafety.matchAll(/^```sh\n([\s\S]*?)^```$/gm)]
  .map((m) => m[1]).find((block) => block.includes('git rebase'));
if (!recipe) throw new Error('merge-safety.md has no restack recipe');

const run = (cwd, ...args) => execFileSync('git', args, {
  cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
}).trim();
// Run the documented restack block verbatim with its variables bound.
const runRecipe = (cwd, vars) => spawnSync('sh', ['-e', '-c', recipe], {
  cwd, encoding: 'utf8', env: { ...process.env, ...vars },
});
function fixture(body) {
  const root = mkdtempSync(join(tmpdir(), 'tstack-shipping-'));
  try {
    run(root, 'init', '-b', 'main');
    run(root, 'config', 'user.email', 'fixture@example.invalid');
    run(root, 'config', 'user.name', 'Fixture');
    // FIX [Claude AI - Opus 5] (2026-10-10 06:21:44): Git for Windows checks
    // out with CRLF when the machine sets core.autocrlf, so content written as
    // LF read back as CRLF. These tests assert on restacked content, not on
    // the machine's line-ending policy.
    run(root, 'config', 'core.autocrlf', 'false');
    const commit = (file, content) => {
      writeFileSync(join(root, file), content);
      run(root, 'add', file);
      run(root, 'commit', '-m', `Update ${file}`);
      return run(root, 'rev-parse', 'HEAD');
    };
    commit('base.txt', 'base\n');
    body(root, commit);
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test('after a parent squash, replay only child commits and preserve final content', () => fixture((root, commit) => {
  const remote = join(root, 'remote.git');
  run(root, 'init', '--bare', remote);
  run(root, 'remote', 'add', 'origin', remote);
  run(root, 'checkout', '-b', 'parent');
  commit('parent.txt', 'first\n');
  const oldParent = commit('parent.txt', 'parent final\n');
  run(root, 'checkout', '-b', 'child');
  const captured = commit('child.txt', 'child only\n');
  run(root, 'push', 'origin', 'child');
  run(root, 'checkout', 'main');
  run(root, 'merge', '--squash', 'parent');
  run(root, 'commit', '-m', 'Squash parent');
  const trunk = run(root, 'rev-parse', 'HEAD');
  const restack = runRecipe(root, {
    old_parent_tip: oldParent, trunk_tip: trunk, child: 'child', captured_remote_head: captured,
  });
  assert.equal(restack.status, 0, restack.stderr);
  assert.equal(run(root, 'rev-list', '--count', `${trunk}..child`), '1');
  assert.equal(run(root, 'diff', '--name-only', `${trunk}..child`), 'child.txt');
  assert.equal(readFileSync(join(root, 'parent.txt'), 'utf8'), 'parent final\n');
  assert.equal(readFileSync(join(root, 'child.txt'), 'utf8'), 'child only\n');
  assert.equal(run(root, 'ls-remote', 'origin', 'refs/heads/child').split(/\s/)[0], run(root, 'rev-parse', 'child'));
}));

test('explicit pre-rewrite lease refuses concurrent work even after a background fetch', () => fixture((root, commit) => {
  const remote = join(root, 'remote.git');
  run(root, 'init', '--bare', remote);
  run(root, 'remote', 'add', 'origin', remote);
  run(root, 'checkout', '-b', 'child');
  const captured = commit('child.txt', 'original\n');
  run(root, 'push', 'origin', 'child');
  const concurrent = commit('concurrent.txt', 'someone else\n');
  run(root, 'push', 'origin', 'child');
  run(root, 'reset', '--hard', captured);
  commit('child.txt', 'rewritten\n');
  run(root, 'fetch', 'origin');
  // No parent moved, so the rebase is a no-op and the push is the step under test.
  const push = runRecipe(root, {
    old_parent_tip: 'main', trunk_tip: 'main', child: 'child', captured_remote_head: captured,
  });
  assert.notEqual(push.status, 0);
  assert.match(push.stderr, /stale info/);
  assert.equal(run(root, 'ls-remote', 'origin', 'refs/heads/child').split(/\s/)[0], concurrent);
}));
