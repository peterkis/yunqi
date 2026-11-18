import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const evidencePath = 'docs/plans/2026-11-18-stage-facts/evidence/';
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const read = (path) => readFileSync(new URL(path, new URL('../../../../', import.meta.url)), 'utf8');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const baseline = JSON.parse(read(evidencePath + 'E1-boundary-baseline.json'));
const branch = git('branch', '--show-current').trim();
const head = git('rev-parse', 'HEAD').trim();
assert.equal(branch, 'feat/stage-facts');
assert.equal(head, baseline.head);

const paths = [...new Set([
  ...git('diff', '--name-only', '-z', 'HEAD').split('\0'),
  ...git('ls-files', '--others', '--exclude-standard', '-z').split('\0'),
].filter(Boolean))].sort();
for (const path of paths) {
  assert.ok(path.startsWith('packages/yunqi-domain/') || path.startsWith(evidencePath)
    || path === 'rules/LEARNING_RULES_V1_1.md' || path === 'docs/agents/rules-and-time.md', `Outside E1 scope: ${path}`);
}
const guidance = 'docs/agents/rules-and-time.md';
assert.equal(read(guidance), git('show', `HEAD:${guidance}`).replace(
  '[教学规则1.0](../../rules/LEARNING_RULES_V1.md)', '[教学规则1.1](../../rules/LEARNING_RULES_V1_1.md)',
));
const domainPackage = 'packages/yunqi-domain/package.json';
assert.equal(read(domainPackage), git('show', `HEAD:${domainPackage}`).replace('"version": "1.3.1"', '"version": "1.4.0"'));
git('diff', '--exit-code', 'HEAD', '--',
  'rules/PHASE1_IMPLEMENTATION_RULES_V1_1.md', 'rules/LEARNING_RULES_V1.md',
  'packages/yunqi-domain/src/rules/phase1-rules.ts', 'packages/yunqi-service',
  'packages/yunqi-contracts', 'packages/yunqi-client', 'apps/yunqi-workbench',
  'docs/design', '.github/workflows/ci.yml', 'pnpm-lock.yaml');

function coverage(logName) {
  const log = read(evidencePath + logName);
  return Object.fromEntries(['Statements', 'Branches', 'Functions', 'Lines'].map((metric) => {
    const match = log.match(new RegExp(`^${metric}\\s*:\\s*([\\d.]+)%`, 'm'));
    assert.ok(match, `Missing Domain ${metric} in ${logName}`);
    return [metric, Number(match[1])];
  }));
}
const coverageComparison = {
  baseline: coverage('E1-baseline-domain-coverage.txt'),
  initial: coverage('E1-coverage.txt'),
  final: coverage('E1-final-coverage.txt'),
  initialNoRegressionCriterion: 'FAIL: Lines 96.88 < baseline 96.94 despite command exit 0; preserved initial log.',
  finalNoRegressionCriterion: 'PASS',
};
for (const metric of Object.keys(coverageComparison.baseline)) {
  assert.ok(coverageComparison.final[metric] >= coverageComparison.baseline[metric], `Coverage regression: ${metric}`);
}
const sourceManifest = paths.filter((path) => !path.startsWith(evidencePath))
  .map((path) => ({ path, sha256: sha256(readFileSync(new URL(path, new URL('../../../../', import.meta.url)))) }));
const state = {
  task: 'E1', branch, head, initialWorktree: baseline.worktreeBeforeTask,
  node: process.version, pnpm: execFileSync('pnpm', ['--version'], { cwd: root, encoding: 'utf8' }).trim(),
  lockSha256: sha256(read('pnpm-lock.yaml')),
  scope: 'PASS; only Domain, new teaching rules 1.1, the allowed guidance link and E1 evidence changed.',
  historicalRulesAndDownstreamPackages: 'UNCHANGED',
  browser: { command: 'pnpm test:browser', status: 'NOT_RUN', exitCode: null, reason: 'Task card specifies Chromium cannot start in this sandbox; E1 changes no UI or browser cases.' },
  coverageComparison,
  sourceManifest,
};
writeFileSync(new URL('./E1-state.json', import.meta.url), JSON.stringify(state, null, 2) + '\n');
console.log(JSON.stringify({ branch, head, changedSourceFiles: sourceManifest.length, scope: state.scope, coverageComparison }, null, 2));
