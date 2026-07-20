import assert from 'node:assert/strict';
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
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const readJson = (path) =>
  JSON.parse(readFileSync(join(root, path), 'utf8'));
const { findWorkbenchGovernanceViolations } = await import(
  '../scripts/check-yunqi-workbench-governance.mjs'
);
const checker = resolve(
  root,
  'scripts/check-yunqi-workbench-governance.mjs',
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
  indexHtml,
  optionalDependencies,
  peerDependencies,
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
      optionalDependencies,
      peerDependencies,
    }),
  );
  writeFixtureFile(
    fixtureRoot,
    join('apps/yunqi-workbench/src', relativeSourcePath),
    source,
  );
  if (indexHtml !== undefined) {
    writeFixtureFile(
      fixtureRoot,
      'apps/yunqi-workbench/index.html',
      indexHtml,
    );
  }

  return fixtureRoot;
}

async function assertMutationRejected({
  dependencies,
  devDependencies,
  indexHtml,
  optionalDependencies,
  peerDependencies,
  relativeSourcePath,
  source,
  expected,
}) {
  const fixtureRoot = createFixture({
    dependencies,
    devDependencies,
    indexHtml,
    optionalDependencies,
    peerDependencies,
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
      '@testing-library/react': '16.3.2',
      typescript: '7.0.2',
      vitest: '4.1.10',
    },
  });

  assert.deepEqual(
    await findWorkbenchGovernanceViolations(fixtureRoot),
    [],
  );
});

for (const [label, source] of [
  [
    'static import',
    "import helper from 'runtime-helper';\nexport { helper };",
  ],
  [
    'dynamic import',
    "export const helper = import('runtime-helper');",
  ],
  [
    'require call',
    "export const helper = require('runtime-helper');",
  ],
]) {
  test(`rejects a devDependency-only bare runtime ${label} in production source`, async () => {
    await assertMutationRejected({
      devDependencies: {
        'runtime-helper': '1.0.0',
        vitest: '4.1.10',
      },
      relativeSourcePath: 'components/RuntimeHelper.ts',
      source,
      expected:
        /components\/RuntimeHelper\.ts: runtime import runtime-helper is not in the Workbench allowlist/,
    });
  });
}

test('rejects an npm-aliased bare runtime import in production source', async () => {
  await assertMutationRejected({
    devDependencies: {
      'runtime-helper': 'npm:react@19.2.7',
      vitest: '4.1.10',
    },
    relativeSourcePath: 'features/runtime-helper.ts',
    source: "import helper from 'runtime-helper';\nexport { helper };",
    expected:
      /features\/runtime-helper\.ts: runtime import runtime-helper is not in the Workbench allowlist/,
  });
});

test('allows type-only bare imports in production source', async () => {
  const fixtureRoot = createFixture({
    devDependencies: {
      'runtime-helper': '1.0.0',
      vitest: '4.1.10',
    },
    relativeSourcePath: 'models/runtime-helper.ts',
    source: `
      import type Helper from 'runtime-helper';
      export type { Helper as RuntimeHelper } from 'runtime-helper';
    `,
  });

  assert.deepEqual(
    await findWorkbenchGovernanceViolations(fixtureRoot),
    [],
  );
});

test('does not treat test source or root tool configuration as production runtime imports', async () => {
  const fixtureRoot = createFixture({
    devDependencies: {
      'runtime-helper': '1.0.0',
      vitest: '4.1.10',
    },
    relativeSourcePath: 'test/runtime-helper.ts',
    source: "import helper from 'runtime-helper';\nexport { helper };",
  });
  writeFixtureFile(
    fixtureRoot,
    'apps/yunqi-workbench/vite.config.ts',
    "import helper from 'runtime-helper';\nexport default helper;",
  );

  assert.deepEqual(
    await findWorkbenchGovernanceViolations(fixtureRoot),
    [],
  );
});

test('rejects a Workbench document language other than zh-CN', async () => {
  await assertMutationRejected({
    indexHtml: '<!doctype html><html lang="en"><body></body></html>',
    expected:
      /apps\/yunqi-workbench\/index\.html: document language must be zh-CN/,
  });
});

test('allows a zh-CN Workbench document language', async () => {
  const fixtureRoot = createFixture({
    indexHtml:
      '<!doctype html><html lang="zh-CN"><body></body></html>',
  });

  assert.deepEqual(
    await findWorkbenchGovernanceViolations(fixtureRoot),
    [],
  );
});

for (const [group, dependency] of [
  ['peerDependencies', 'react-router-dom'],
  ['optionalDependencies', 'axios'],
]) {
  test(`rejects ${group} runtime dependency ${dependency}`, async () => {
    await assertMutationRejected({
      [group]: { [dependency]: '1.0.0' },
      expected: new RegExp(
        `package\\.json: runtime dependency ${dependency} is not allowed \\(${group}\\)`,
      ),
    });
  });
}

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

for (const [packageName, source] of [
  [
    '@yunqi/service',
    "import { forbidden } from '@yunqi/service';\nexport { forbidden };",
  ],
  [
    '@yunqi/domain',
    "const forbidden = require('@yunqi/domain');\nexport { forbidden };",
  ],
  [
    'axios',
    "import axios from 'axios';\nexport { axios };",
  ],
  [
    'react-router-dom',
    "export const router = import('react-router-dom');",
  ],
]) {
  test(`rejects source import from ${packageName}`, async () => {
    await assertMutationRejected({
      devDependencies: {
        [packageName]: '1.0.0',
        vitest: '4.1.10',
      },
      relativeSourcePath: 'features/fixture.ts',
      source,
      expected: new RegExp(
        `features/fixture\\.ts: forbidden import ${packageName.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        )}`,
      ),
    });
  });
}

for (const [label, relativeSourcePath, source] of [
  [
    'Service',
    'features/fixture.ts',
    "import '../../../../packages/yunqi-service/src/index.ts';",
  ],
  [
    'Domain with Windows separators',
    'app/fixture.ts',
    "const domain = require('..\\\\..\\\\..\\\\..\\\\packages\\\\yunqi-domain\\\\src\\\\index.ts');",
  ],
]) {
  test(`rejects relative import escaping to ${label}`, async () => {
    await assertMutationRejected({
      relativeSourcePath,
      source,
      expected: new RegExp(
        `${relativeSourcePath.replaceAll('.', '\\.').replaceAll('/', '\\/')}.*relative import.*escapes apps/yunqi-workbench`,
      ),
    });
  });
}

test('rejects an absolute local import path', async () => {
  const fixtureRoot = createFixture();
  const absoluteTarget = join(
    fixtureRoot,
    'packages/yunqi-service/src/index.ts',
  ).replaceAll('\\', '/');
  writeFixtureFile(
    fixtureRoot,
    'apps/yunqi-workbench/src/features/absolute.ts',
    `import '${absoluteTarget}';`,
  );
  const violations =
    await findWorkbenchGovernanceViolations(fixtureRoot);

  assert.ok(
    violations.some((violation) =>
      /features\/absolute\.ts: absolute local import .* is forbidden/.test(
        violation,
      ),
    ),
    violations.join('\n'),
  );
});

test('allows an app-relative import that stays inside the Workbench', async () => {
  const fixtureRoot = createFixture({
    relativeSourcePath: 'app/App.ts',
    source: "import { Fixture } from '../components/Fixture';\nexport { Fixture };",
  });

  assert.deepEqual(
    await findWorkbenchGovernanceViolations(fixtureRoot),
    [],
  );
});

test('allows client-context usage in a TSX feature hook', async () => {
  const fixtureRoot = createFixture({
    relativeSourcePath: 'features/yunqi/hooks/useCurrent.tsx',
    source: `
      export function useCurrent(client) {
        return client.getCurrent();
      }
    `,
  });

  assert.deepEqual(
    await findWorkbenchGovernanceViolations(fixtureRoot),
    [],
  );
});

test('allows client runtime ownership in TSX provider infrastructure', async () => {
  const fixtureRoot = createFixture({
    relativeSourcePath: 'providers/YunQiClientProvider.tsx',
    source: `
      import { createYunQiClient } from '@yunqi/client';
      export const client = createYunQiClient(transport);
      export const current = client.getCurrent;
    `,
  });

  assert.deepEqual(
    await findWorkbenchGovernanceViolations(fixtureRoot),
    [],
  );
});

test('allows a type-only client import in component source', async () => {
  const fixtureRoot = createFixture({
    relativeSourcePath: 'components/Typed.ts',
    source: `
      import React from 'react';
      import type { YunQiClient } from '@yunqi/client';
      export interface Props { readonly client: YunQiClient; }
      export const element = React.createElement('main');
    `,
  });

  assert.deepEqual(
    await findWorkbenchGovernanceViolations(fixtureRoot),
    [],
  );
});

test('rejects a runtime client import in component source', async () => {
  await assertMutationRejected({
    relativeSourcePath: 'components/ClientOwner.ts',
    source: `
      import { createYunQiClient } from '@yunqi/client';
      export const client = createYunQiClient(transport);
    `,
    expected:
      /components\/ClientOwner\.ts: runtime @yunqi\/client import\/re-export is forbidden in component source/,
  });
});

for (const [label, source] of [
  [
    'named runtime re-export',
    "export { createYunQiClient } from '@yunqi/client';",
  ],
  [
    'star runtime re-export',
    "export * from '@yunqi/client';",
  ],
  [
    'multiline runtime re-export',
    `export {
      createFetchTransport,
      createYunQiClient,
    } from '@yunqi/client';`,
  ],
  [
    'mixed type and runtime re-export',
    `export {
      type YunQiClient,
      createYunQiClient,
    } from '@yunqi/client';`,
  ],
]) {
  test(`rejects ${label} in component source`, async () => {
    await assertMutationRejected({
      relativeSourcePath: 'components/ClientExports.ts',
      source,
      expected:
        /components\/ClientExports\.ts: runtime @yunqi\/client import\/re-export is forbidden in component source/,
    });
  });
}

for (const [label, source] of [
  [
    'export type declaration',
    "export type { YunQiClient } from '@yunqi/client';",
  ],
  [
    'type-only named re-export',
    "export { type YunQiClient } from '@yunqi/client';",
  ],
]) {
  test(`allows ${label} in component source`, async () => {
    const fixtureRoot = createFixture({
      relativeSourcePath: 'components/ClientTypes.ts',
      source,
    });

    assert.deepEqual(
      await findWorkbenchGovernanceViolations(fixtureRoot),
      [],
    );
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
      /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
  });
});

test('rejects direct client calls in non-TSX component responsibility paths', async () => {
  await assertMutationRejected({
    relativeSourcePath: 'components/Foo.ts',
    source: `
      import React from 'react';
      export function Foo() {
        yunqiClient.getCurrent();
        return React.createElement('main');
      }
    `,
    expected:
      /components\/Foo\.ts: direct YunQi client method access is forbidden/,
  });
});

for (const method of ['getCurrent', 'getYear', 'calculate']) {
  test(`rejects bracket access to client method ${method}`, async () => {
    await assertMutationRejected({
      relativeSourcePath: `features/yunqi/components/${method}.js`,
      source: `
        export function Card() {
          client['${method}']();
          return null;
        }
      `,
      expected: new RegExp(
        `features/yunqi/components/${method}\\.js: direct YunQi client method access is forbidden`,
      ),
    });
  });
}

test('rejects optional client method invocation in component source', async () => {
  await assertMutationRejected({
    source: `
      export function Fixture() {
        client.getCurrent?.();
        return null;
      }
    `,
    expected:
      /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
  });
});

test('rejects taking a client method reference in component source', async () => {
  await assertMutationRejected({
    source: `
      export function Fixture() {
        const current = yunqiClient.getCurrent;
        return current;
      }
    `,
    expected:
      /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
  });
});

test('rejects a client method capability passed under a generic prop name', async () => {
  await assertMutationRejected({
    source: `
      export function Fixture({ api }) {
        const current = api['getCurrent'];
        return current;
      }
    `,
    expected:
      /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
  });
});

for (const method of ['getCurrent', 'getYear', 'calculate']) {
  test(`rejects destructuring ${method} from a generic receiver in component source`, async () => {
    await assertMutationRejected({
      source: `
        export function Fixture({ api }) {
          const { ${method} } = api;
          return ${method};
        }
      `,
      expected:
        /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
    });
  });
}

test('allows similarly named fields on ordinary DTO values', async () => {
  const fixtureRoot = createFixture({
    relativeSourcePath: 'components/Summary.ts',
    source: `
      export function summarize(result, dto) {
        const localTime = result.input.localTime;
        const { year, interval } = dto;
        return { localTime, year, interval };
      }
    `,
  });

  assert.deepEqual(
    await findWorkbenchGovernanceViolations(fixtureRoot),
    [],
  );
});

test('rejects a frozen DTO import in component source', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/components/DirectDtoView.tsx',
    source: `
      import type {
        YunQiCalculationDto,
      } from '@yunqi/contracts';
      export function DirectDtoView(
        props: { readonly value: YunQiCalculationDto },
      ) {
        return <main>{props.value.year}</main>;
      }
    `,
    expected:
      /features\/yunqi\/components\/DirectDtoView\.tsx: frozen DTO imports from @yunqi\/contracts are forbidden in component source/,
  });
});

test('rejects a contracts namespace import in component source', async () => {
  await assertMutationRejected({
    relativeSourcePath: 'components/ContractNamespace.ts',
    source: `
      import type * as Contracts from '@yunqi/contracts';
      export type Value = Contracts.YunQiTimeDto;
    `,
    expected:
      /components\/ContractNamespace\.ts: frozen DTO imports from @yunqi\/contracts are forbidden in component source/,
  });
});

for (const [label, source, expected] of [
  [
    'React',
    "import type { ReactNode } from 'react';\nexport type Value = ReactNode;",
    /presentation\/mapper\.ts: React imports are forbidden in presentation mapper source/,
  ],
  [
    'TanStack Query',
    "import { queryOptions } from '@tanstack/react-query';\nexport { queryOptions };",
    /presentation\/mapper\.ts: TanStack Query imports are forbidden in presentation mapper source/,
  ],
  [
    'YunQi client',
    "import type { YunQiClient } from '@yunqi/client';\nexport type Value = YunQiClient;",
    /presentation\/mapper\.ts: @yunqi\/client imports are forbidden in presentation mapper source/,
  ],
]) {
  test(`rejects ${label} dependency in presentation mapper source`, async () => {
    await assertMutationRejected({
      relativeSourcePath: 'features/yunqi/presentation/mapper.ts',
      source,
      expected,
    });
  });
}

test('rejects direct client capability access in presentation mapper source', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/mapper.ts',
    source: `
      export function map(client) {
        return client.getCurrent();
      }
    `,
    expected:
      /presentation\/mapper\.ts: client method access is forbidden in presentation mapper source/,
  });
});

test('does not apply component capability rules to test files', async () => {
  const fixtureRoot = createFixture({
    relativeSourcePath: 'components/Fixture.test.ts',
    source: `
      import { createYunQiClient } from '@yunqi/client';
      client.getCurrent?.();
      const { calculate } = client;
      export { createYunQiClient, calculate };
    `,
  });

  assert.deepEqual(
    await findWorkbenchGovernanceViolations(fixtureRoot),
    [],
  );
});

test('rejects a copied frozen DTO declaration', async () => {
  await assertMutationRejected({
    relativeSourcePath: 'models/copied-dto.ts',
    source: 'export interface YunQiTimeDto {}',
    expected:
      /models\/copied-dto\.ts: frozen DTO YunQiTimeDto must be imported from @yunqi\/contracts/,
  });
});

test('rejects a default-exported copied frozen DTO declaration', async () => {
  await assertMutationRejected({
    relativeSourcePath: 'models/default-copied-dto.ts',
    source: 'export default interface YunQiTimeDto {}',
    expected:
      /models\/default-copied-dto\.ts: frozen DTO YunQiTimeDto must be imported from @yunqi\/contracts/,
  });
});

test('CLI exits non-zero and prints every path-qualified violation', () => {
  const fixtureRoot = createFixture({
    optionalDependencies: { axios: '1.0.0' },
    peerDependencies: { 'react-router-dom': '7.0.0' },
  });
  const result = spawnSync(
    process.execPath,
    [checker, '--root', fixtureRoot],
    { encoding: 'utf8' },
  );
  const output = result.stderr.trim().split(/\r?\n/);

  assert.equal(result.status, 1);
  assert.equal(output.length, 2, result.stderr);
  assert.ok(
    output.every((line) =>
      line.startsWith('apps/yunqi-workbench/package.json:'),
    ),
    result.stderr,
  );
  assert.match(result.stderr, /optionalDependencies/);
  assert.match(result.stderr, /peerDependencies/);
});
