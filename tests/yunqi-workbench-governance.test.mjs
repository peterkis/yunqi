import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const readJson = (path) =>
  JSON.parse(readFileSync(join(root, path), 'utf8'));
const { findWorkbenchGovernanceViolations } = await import(
  '../scripts/check-yunqi-workbench-governance.mjs'
);

const allowedRuntimeDependencies = {
  '@tanstack/react-query': '5.101.2',
  '@yunqi/client': 'workspace:*',
  '@yunqi/contracts': 'workspace:*',
  react: '19.2.7',
  'react-dom': '19.2.7',
};

function writeFixtureFile(fixtureRoot, relativePath, source) {
  const target = join(fixtureRoot, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, source, 'utf8');
}

function createFixture({
  dependencies = allowedRuntimeDependencies,
  devDependencies = { vitest: '4.1.10' },
  relativeSourcePath = 'components/Fixture.tsx',
  source = 'export function Fixture() { return <main />; }',
} = {}) {
  const fixtureRoot = mkdtempSync(
    join(tmpdir(), 'yunqi-workbench-governance-'),
  );

  writeFixtureFile(
    fixtureRoot,
    'apps/yunqi-workbench/package.json',
    JSON.stringify({
      name: '@yunqi/workbench',
      private: true,
      dependencies,
      devDependencies,
    }),
  );
  writeFixtureFile(
    fixtureRoot,
    join('apps/yunqi-workbench/src', relativeSourcePath),
    source,
  );

  return fixtureRoot;
}

async function assertMutationRejected({
  dependencies,
  relativeSourcePath,
  source,
  expected,
}) {
  const fixtureRoot = createFixture({
    dependencies,
    relativeSourcePath,
    source,
  });
  const violations = await findWorkbenchGovernanceViolations(fixtureRoot);

  assert.ok(
    violations.some((violation) => expected.test(violation)),
    `Expected ${expected}, received:\n${violations.join('\n')}`,
  );
  assert.ok(
    violations.every((violation) =>
      violation.startsWith('apps/yunqi-workbench/'),
    ),
    `Every violation must be path-qualified:\n${violations.join('\n')}`,
  );
}

test('Workbench workspace and versions are pinned', () => {
  const app = readJson('apps/yunqi-workbench/package.json');
  const workspace = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
  const rootPackage = readJson('package.json');

  assert.equal(app.name, '@yunqi/workbench');
  assert.equal(app.engines.node, '>=22');
  assert.equal(app.dependencies.react, '19.2.7');
  assert.equal(app.dependencies['react-dom'], '19.2.7');
  assert.equal(app.dependencies['@tanstack/react-query'], '5.101.2');
  assert.equal(app.dependencies['@yunqi/client'], 'workspace:*');
  assert.equal(app.dependencies['@yunqi/contracts'], 'workspace:*');
  assert.equal(rootPackage.engines.node, '>=22');
  assert.match(workspace, /apps\/\*/);
  assert.doesNotMatch(JSON.stringify(app), /next|react-router|axios/);
});

test('production Workbench has no governance violations', async () => {
  assert.deepEqual(await findWorkbenchGovernanceViolations(root), []);
});

test('allows development-only dependencies without treating them as runtime', async () => {
  const fixtureRoot = createFixture({
    devDependencies: {
      axios: '1.0.0',
      'react-router-dom': '7.0.0',
      vitest: '4.1.10',
    },
  });

  assert.deepEqual(
    await findWorkbenchGovernanceViolations(fixtureRoot),
    [],
  );
});

for (const dependency of [
  '@yunqi/service',
  '@yunqi/domain',
  'axios',
  'react-router-dom',
]) {
  test(`rejects runtime dependency ${dependency}`, async () => {
    await assertMutationRejected({
      dependencies: {
        ...allowedRuntimeDependencies,
        [dependency]: '1.0.0',
      },
      expected: new RegExp(
        `package\\.json: runtime dependency ${dependency.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        )} is not allowed`,
      ),
    });
  });
}

for (const packageName of ['@yunqi/service', '@yunqi/domain']) {
  test(`rejects source import from ${packageName}`, async () => {
    await assertMutationRejected({
      relativeSourcePath: 'features/fixture.ts',
      source: `import { forbidden } from '${packageName}';\nexport { forbidden };`,
      expected: new RegExp(
        `features/fixture\\.ts: forbidden import ${packageName.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        )}`,
      ),
    });
  });
}

test('rejects direct fetch in component source', async () => {
  await assertMutationRejected({
    source:
      "export function Fixture() { fetch('/health'); return <main />; }",
    expected: /components\/Fixture\.tsx: direct fetch is forbidden/,
  });
});

test('rejects direct YunQi API path in component source', async () => {
  await assertMutationRejected({
    source:
      "export function Fixture() { return <main data-path='/api/v1/yunqi/current' />; }",
    expected:
      /components\/Fixture\.tsx: direct YunQi API path is forbidden/,
  });
});

test('rejects direct YunQi client method call in component source', async () => {
  await assertMutationRejected({
    source:
      'export function Fixture() { yunqiClient.getCurrent(); return <main />; }',
    expected:
      /components\/Fixture\.tsx: direct YunQi client method call is forbidden/,
  });
});

test('rejects a copied frozen DTO declaration', async () => {
  await assertMutationRejected({
    relativeSourcePath: 'models/copied-dto.ts',
    source: 'export interface YunQiTimeDto {}',
    expected:
      /models\/copied-dto\.ts: frozen DTO YunQiTimeDto must be imported from @yunqi\/contracts/,
  });
});
