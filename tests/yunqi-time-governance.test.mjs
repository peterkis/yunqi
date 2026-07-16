import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
);
const checker = resolve(
  repositoryRoot,
  'scripts/check-yunqi-time-governance.mjs',
);

const REQUIRED_GOVERNANCE = `
YunQiInstant is the BeijingStandardTime+08:00 Absolute Representation.
calendar_time_local varchar
epoch_ms bigint
offset char(6)
calendar_time_standard varchar
timestamp with time zone must not be the sole or authoritative field.
React must use localTime or a fixed-Beijing formatter.
new Date(result.epochMilliseconds) is forbidden.
`;

function writeFixtureFile(root, relativePath, source) {
  const target = join(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, source, 'utf8');
}

function createFixture(frontendSource) {
  const root = mkdtempSync(join(tmpdir(), 'yunqi-time-governance-'));

  writeFixtureFile(root, 'AGENTS.md', REQUIRED_GOVERNANCE);
  writeFixtureFile(
    root,
    'docs/architecture/adr/ADR-001-fixed-beijing-time-semantics.md',
    REQUIRED_GOVERNANCE,
  );
  writeFixtureFile(
    root,
    'packages/yunqi-domain/src/calendar/time.ts',
    `/** BeijingStandardTime+08:00 Absolute Representation. */\nexport interface YunQiInstant { readonly epochMilliseconds: number; }\n`,
  );
  writeFixtureFile(
    root,
    'packages/yunqi-workbench/package.json',
    JSON.stringify({
      name: '@yunqi/workbench',
      dependencies: { react: '19.0.0' },
    }),
  );
  writeFixtureFile(
    root,
    'packages/yunqi-workbench/src/time-view.tsx',
    frontendSource,
  );

  return root;
}

function runChecker(root) {
  return spawnSync(
    process.execPath,
    [checker, '--root', root],
    { encoding: 'utf8' },
  );
}

test('accepts React rendering of canonical localTime', () => {
  const root = createFixture(
    'export const TimeView = ({ result }) => <time>{result.localTime}</time>;',
  );
  const result = runChecker(root);

  assert.equal(result.status, 0, result.stderr);
});

test('rejects Date reinterpretation of YunQi epochMilliseconds', () => {
  const root = createFixture(
    'export const value = new Date(result.epochMilliseconds).toLocaleString();',
  );
  const result = runChecker(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Date API.*epochMilliseconds/);
});

test('rejects Intl reinterpretation of YunQi epochMilliseconds', () => {
  const root = createFixture(
    'export const value = new Intl.DateTimeFormat().format(result.epochMilliseconds);',
  );
  const result = runChecker(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Intl API.*epochMilliseconds/);
});

test('rejects Date reinterpretation hidden behind a frontend helper', () => {
  const root = createFixture(
    `import { formatInstant } from './formatter';
     export const value = formatInstant(result.epochMilliseconds);`,
  );
  writeFixtureFile(
    root,
    'packages/yunqi-workbench/src/formatter.ts',
    'export const formatInstant = (value) => new Date(value).toLocaleString();',
  );
  const result = runChecker(root);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /formatter\.ts: Date API forbidden in React\/Next workspace/,
  );
});

test('rejects Temporal and IANA reinterpretation in YunQi time modules', () => {
  const root = createFixture(
    `export const standard = 'Asia/Shanghai';
     export const value = Temporal.Instant.fromEpochMilliseconds(result.epochMilliseconds);`,
  );
  const result = runChecker(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Temporal API.*epochMilliseconds/);
  assert.match(result.stderr, /IANA business-time identifier/);
});

test('rejects incomplete persistence governance', () => {
  const root = createFixture(
    'export const TimeView = ({ result }) => <time>{result.localTime}</time>;',
  );
  const agentsPath = join(root, 'AGENTS.md');
  writeFileSync(
    agentsPath,
    readFileSync(agentsPath, 'utf8').replace('epoch_ms bigint', ''),
    'utf8',
  );
  const result = runChecker(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /AGENTS\.md.*epoch_ms bigint/);
});

test('rejects an ambiguous YunQiInstant declaration', () => {
  const root = createFixture(
    'export const TimeView = ({ result }) => <time>{result.localTime}</time>;',
  );
  writeFixtureFile(
    root,
    'packages/yunqi-domain/src/calendar/time.ts',
    'export interface YunQiInstant { readonly epochMilliseconds: number; }\n',
  );
  const result = runChecker(root);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /YunQiInstant.*BeijingStandardTime\+08:00 Absolute Representation/,
  );
});
