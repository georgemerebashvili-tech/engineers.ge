#!/usr/bin/env node
/**
 * engineers.ge · Launch-check — runs every pre-launch gate sequentially.
 *
 * Steps:
 *   1. typecheck         — tsc --noEmit
 *   2. lint              — eslint
 *   3. smoke             — HTTP suite against a server you already started
 *
 * The smoke step expects a dev/prod server on SMOKE_URL (default localhost:3001).
 * We don't boot it here because tests/CI and local workflows differ; pipe it in.
 *
 * Exit code 0 = all green · 1 = one or more gates failed.
 */
import {spawn} from 'node:child_process';

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

const STEPS = [
  {name: 'typecheck', cmd: 'npx', args: ['tsc', '--noEmit'], blocking: true},
  // Lint is advisory today — legacy codebase has pre-existing errors we haven't
  // backfilled yet. New code is still expected to respect eslint; CI surfaces
  // the report, but does not block merges on the historical debt.
  {name: 'lint', cmd: 'npx', args: ['eslint', '.', '--ext', '.ts,.tsx'], blocking: false},
  {name: 'smoke', cmd: 'node', args: ['scripts/smoke.mjs'], blocking: true}
];

async function run(step) {
  return new Promise((resolve) => {
    const started = Date.now();
    const proc = spawn(step.cmd, step.args, {stdio: 'inherit'});
    proc.on('close', (code) => {
      resolve({
        name: step.name,
        ok: code === 0,
        blocking: step.blocking,
        ms: Date.now() - started,
        code
      });
    });
  });
}

const results = [];
for (const step of STEPS) {
  console.log(`\n${COLORS.bold}▶ ${step.name}${COLORS.reset} ${COLORS.dim}(${step.cmd} ${step.args.join(' ')})${COLORS.reset}\n`);
  const result = await run(step);
  results.push(result);
  if (!result.ok && result.blocking && process.env.FAIL_FAST === '1') break;
}

const blockingFailed = results.filter((r) => !r.ok && r.blocking).length;
const advisoryFailed = results.filter((r) => !r.ok && !r.blocking).length;
const passed = results.filter((r) => r.ok).length;
const total = results.length;

console.log(`\n${COLORS.bold}Launch-check summary${COLORS.reset}\n`);
for (const r of results) {
  const icon = r.ok
    ? `${COLORS.green}✓${COLORS.reset}`
    : r.blocking
    ? `${COLORS.red}✗${COLORS.reset}`
    : `${COLORS.yellow}⚠${COLORS.reset}`;
  const s = Math.round(r.ms / 100) / 10;
  const tag = r.blocking ? '' : ` ${COLORS.dim}(advisory)${COLORS.reset}`;
  console.log(
    `  ${icon} ${r.name.padEnd(12)} ${COLORS.dim}${s}s${COLORS.reset}${tag}` +
      (r.ok ? '' : `   ${COLORS.dim}exit ${r.code}${COLORS.reset}`)
  );
}

const ok = blockingFailed === 0;
console.log(
  `\n${ok ? COLORS.green : COLORS.red}${COLORS.bold}${passed}/${total} passed${COLORS.reset}` +
    (advisoryFailed > 0 ? ` ${COLORS.yellow}(${advisoryFailed} advisory)${COLORS.reset}` : '') +
    '\n'
);

process.exit(ok ? 0 : 1);
