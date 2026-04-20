#!/usr/bin/env node
/**
 * engineers.ge · Git hooks installer.
 *
 * Runs automatically via `npm install` (package.json `prepare` hook).
 * Points `core.hooksPath` at `.githooks/` so the repo's tracked hooks fire
 * on every commit / push — no manual copy-paste into .git/hooks/.
 *
 * Safe to run repeatedly. Skips silently if not inside a git work-tree
 * (e.g. Vercel's build environment may install deps from a tarball).
 */
import {execSync} from 'node:child_process';
import {existsSync, statSync} from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const cwd = process.cwd();

// Must be inside a git work-tree, otherwise git config has nowhere to land.
try {
  execSync('git rev-parse --is-inside-work-tree', {stdio: 'pipe'});
} catch {
  // Not a git clone (tarball install on Vercel, npm pack, etc.) — no-op.
  process.exit(0);
}

const hookDir = path.join(cwd, '.githooks');
if (!existsSync(hookDir) || !statSync(hookDir).isDirectory()) {
  process.exit(0);
}

try {
  execSync('git config core.hooksPath .githooks', {stdio: 'pipe'});
  console.log('[install-git-hooks] core.hooksPath → .githooks');
} catch (e) {
  console.warn(
    '[install-git-hooks] failed to set core.hooksPath:',
    e instanceof Error ? e.message : e
  );
}
