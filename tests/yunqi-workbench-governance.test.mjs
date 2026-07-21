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
  'react-router-dom': '7.18.1',
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
  assert.equal(app.dependencies['react-router-dom'], '7.18.1');
  assert.doesNotMatch(JSON.stringify(app), /next|axios/);
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
  [
    'empty named import',
    "import {} from 'runtime-helper';",
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
  ['peerDependencies', 'unlisted-router'],
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
  'unlisted-router',
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
  ['unlisted-router', "export const router = import('unlisted-router');"],
]) {
  test(`rejects source import from ${packageName}`, async () => {
    await assertMutationRejected({
      devDependencies: {
        [packageName]: '1.0.0',
        vitest: '4.1.10',
      },
      relativeSourcePath: 'features/fixture.ts',
      source,
      expected:
        packageName === 'unlisted-router'
          ? /features\/fixture\.ts: runtime import unlisted-router is not in the Workbench allowlist/
          : new RegExp(
              `features/fixture\\.ts: forbidden import ${packageName.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&',
              )}`,
            ),
    });
  });
}

test('allows the approved react-router-dom runtime dependency and import', async () => {
  const fixtureRoot = createFixture({
    relativeSourcePath: 'app/RouterFixture.tsx',
    source: `
      import { Routes } from 'react-router-dom';
      export function RouterFixture() { return <Routes />; }
    `,
  });

  assert.deepEqual(
    await findWorkbenchGovernanceViolations(fixtureRoot),
    [],
  );
});

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

test('rejects an empty named client import in component source', async () => {
  await assertMutationRejected({
    relativeSourcePath: 'components/EmptyClientImport.ts',
    source: "import {} from '@yunqi/client';",
    expected:
      /components\/EmptyClientImport\.ts: runtime @yunqi\/client import\/re-export is forbidden in component source/,
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

test('rejects a client method behind a TS angle-bracket assertion', async () => {
  await assertMutationRejected({
    relativeSourcePath: 'components/AngleAssertion.ts',
    source: `
      export function read(client) {
        const current = <unknown>client.getCurrent;
        return current;
      }
    `,
    expected:
      /components\/AngleAssertion\.ts: direct YunQi client method access is forbidden/,
  });
});

test('rejects an asserted static client method key', async () => {
  await assertMutationRejected({
    source: `
      export function Fixture({ client }) {
        return client['getCurrent' as const]();
      }
    `,
    expected:
      /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
  });
});

test('rejects a satisfies-wrapped client method destructuring key', async () => {
  await assertMutationRejected({
    source: `
      export function Fixture({ client }) {
        const { ['getCurrent' satisfies string]: load } = client;
        return load;
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

for (const method of ['getCurrent', 'getYear', 'calculate']) {
  test(`rejects destructuring ${method} from component parameters`, async () => {
    await assertMutationRejected({
      source: `
        export function Fixture({ ${method} }) {
          return ${method};
        }
      `,
      expected:
        /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
    });
  });
}

for (const method of ['getCurrent', 'getYear', 'calculate']) {
  test(`rejects destructuring ${method} from arrow component parameters`, async () => {
    await assertMutationRejected({
      source: `
        export const Fixture = ({ ${method} }) => ${method};
      `,
      expected:
        /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
    });
  });
}

test('rejects an aliased client method from component parameters', async () => {
  await assertMutationRejected({
    source: `
      export function Fixture({ getCurrent: loadCurrent }) {
        return loadCurrent;
      }
    `,
    expected:
      /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
  });
});

test('rejects a client method from multiline component parameters', async () => {
  await assertMutationRejected({
    source: `
      export function Fixture({
        getCurrent,
      }) {
        return getCurrent;
      }
    `,
    expected:
      /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
  });
});

test('rejects an aliased client method from multiline arrow parameters', async () => {
  await assertMutationRejected({
    source: `
      export const Fixture = ({
        calculate: runCalculation,
      }) => runCalculation;
    `,
    expected:
      /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
  });
});

test('rejects a client method before an object default in component parameters', async () => {
  await assertMutationRejected({
    source: `
      export const Fixture = ({ getCurrent, style = {} }) => {
        return <main style={style}>{getCurrent}</main>;
      };
    `,
    expected:
      /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
  });
});

test('rejects a client method after an object default in component parameters', async () => {
  await assertMutationRejected({
    source: `
      export function Fixture({ style = {}, getYear }) {
        return <main style={style}>{getYear}</main>;
      }
    `,
    expected:
      /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
  });
});

test('rejects a client method beside an object default in local destructuring', async () => {
  await assertMutationRejected({
    source: `
      export function Fixture({ api }) {
        const { calculate, options = {} } = api;
        return <main>{calculate}{options}</main>;
      }
    `,
    expected:
      /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
  });
});

test('rejects a client method from generic function component parameters', async () => {
  await assertMutationRejected({
    source: `
      export function Fixture<T>({ getCurrent }: Props<T>) {
        return <main>{getCurrent}</main>;
      }
    `,
    expected:
      /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
  });
});

test('rejects a client method after a parameter comment', async () => {
  await assertMutationRejected({
    source: `
      export function Fixture(/* props */ { getCurrent }) {
        return <main>{getCurrent}</main>;
      }
    `,
    expected:
      /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
  });
});

test('rejects a client method after a generic function constraint', async () => {
  await assertMutationRejected({
    source: `
      export function Fixture<T extends () => void>(
        { getCurrent }: Props<T>,
      ) {
        return <main>{getCurrent}</main>;
      }
    `,
    expected:
      /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
  });
});

test('rejects a computed client method in component destructuring', async () => {
  await assertMutationRejected({
    source: `
      export function Fixture({ ['getCurrent']: loadCurrent }) {
        return <main>{loadCurrent}</main>;
      }
    `,
    expected:
      /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
  });
});

test('rejects a concatenated client method in component destructuring', async () => {
  await assertMutationRejected({
    source: `
      export function Fixture({ client }) {
        const {
          ['get' + 'Current']: loadCurrent,
        } = client;
        return <main>{loadCurrent}</main>;
      }
    `,
    expected:
      /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
  });
});

test('rejects a static template client method key', async () => {
  await assertMutationRejected({
    source: `
      export function Fixture({ client }) {
        return client[\`get\${'Current'}\`]();
      }
    `,
    expected:
      /components\/Fixture\.tsx: direct YunQi client method access is forbidden/,
  });
});

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

test('rejects a frozen DTO import type query in component source', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/components/ImportTypeDtoView.tsx',
    source: `
      type Props = {
        readonly value:
          import('@yunqi/contracts').YunQiCalculationDto;
      };
      export function ImportTypeDtoView(props: Props) {
        return <main>{props.value.year}</main>;
      }
    `,
    expected:
      /features\/yunqi\/components\/ImportTypeDtoView\.tsx: frozen DTO imports from @yunqi\/contracts are forbidden in component source/,
  });
});

test('rejects a commented frozen DTO import type query', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/components/CommentedImportTypeDtoView.tsx',
    source: `
      type Props = {
        readonly value:
          import/* type */('@yunqi/contracts').YunQiCalculationDto;
      };
      export function CommentedImportTypeDtoView(props: Props) {
        return <main>{props.value.year}</main>;
      }
    `,
    expected:
      /features\/yunqi\/components\/CommentedImportTypeDtoView\.tsx: frozen DTO imports from @yunqi\/contracts are forbidden in component source/,
  });
});

test('rejects an escaped frozen DTO identifier import', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/components/EscapedDtoView.tsx',
    source: `
      import type {
        YunQiCalculation\\u0044to,
      } from '@yunqi/contracts';
      export type Props = {
        readonly value: YunQiCalculation\\u0044to;
      };
    `,
    expected:
      /features\/yunqi\/components\/EscapedDtoView\.tsx: frozen DTO imports from @yunqi\/contracts are forbidden in component source/,
  });
});

test('rejects an escaped frozen DTO import type query', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/components/EscapedImportTypeDtoView.tsx',
    source: `
      export type Props = {
        readonly value:
          import('@yunqi/contracts').YunQiCalculation\\u0044to;
      };
    `,
    expected:
      /features\/yunqi\/components\/EscapedImportTypeDtoView\.tsx: frozen DTO imports from @yunqi\/contracts are forbidden in component source/,
  });
});

test('rejects a default frozen DTO import', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/components/DefaultDtoView.tsx',
    source: `
      import type YunQiCalculationDto from '@yunqi/contracts';
      export type Props = {
        readonly value: YunQiCalculationDto;
      };
    `,
    expected:
      /features\/yunqi\/components\/DefaultDtoView\.tsx: frozen DTO imports from @yunqi\/contracts are forbidden in component source/,
  });
});

test('rejects a parenthesized indexed frozen DTO import type', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/components/ParenthesizedImportTypeDtoView.tsx',
    source: `
      export type Props =
        (import('@yunqi/contracts'))['YunQiCalculationDto'];
    `,
    expected:
      /features\/yunqi\/components\/ParenthesizedImportTypeDtoView\.tsx: frozen DTO imports from @yunqi\/contracts are forbidden in component source/,
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
  [
    'React Router',
    "import { useNavigate } from 'react-router-dom';\nexport { useNavigate };",
    /presentation\/mapper\.ts: React Router imports are forbidden in presentation mapper source/,
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

test('rejects AnnualStageRail props that replace the canonical timeline model', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/components/AnnualStageRail.tsx',
    source: `
      interface RenamedRailStageCollection {}
      export interface AnnualStageRailProps {
        readonly steps: RenamedRailStageCollection;
      }
      export function AnnualStageRail() { return null; }
    `,
    expected:
      /AnnualStageRail\.tsx: steps must consume CurrentSixQiStageTuple directly/,
  });
});

test('rejects component-side renumbering of a YunQi step index', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/components/AnnualStageRail.tsx',
    source: `
      import type { CurrentSixQiStageTuple } from '../presentation/view-model';
      export interface AnnualStageRailProps {
        readonly steps: CurrentSixQiStageTuple;
      }
      export function AnnualStageRail({ steps }: AnnualStageRailProps) {
        return steps.map((step) => <span>{step.index + 1}</span>);
      }
    `,
    expected:
      /AnnualStageRail\.tsx: stage ordinal arithmetic is forbidden/,
  });
});

test('rejects callback-position renumbering in AnnualStageRail', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/components/AnnualStageRail.tsx',
    source: `
      import type { CurrentSixQiStageTuple } from '../presentation/view-model';
      export interface AnnualStageRailProps {
        readonly steps: CurrentSixQiStageTuple;
      }
      export function AnnualStageRail({ steps }: AnnualStageRailProps) {
        return steps.map((step, index) => <span>{index + 1}</span>);
      }
    `,
    expected:
      /AnnualStageRail\.tsx: stage ordinal arithmetic is forbidden/,
  });
});

test('rejects aliased step-index renumbering in AnnualStageRail', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/components/AnnualStageRail.tsx',
    source: `
      import type { CurrentSixQiStageTuple } from '../presentation/view-model';
      export interface AnnualStageRailProps {
        readonly steps: CurrentSixQiStageTuple;
      }
      export function AnnualStageRail({ steps }: AnnualStageRailProps) {
        return steps.map((step) => {
          const position = step.index;
          return <span>{position + 1}</span>;
        });
      }
    `,
    expected:
      /AnnualStageRail\.tsx: stage ordinal arithmetic is forbidden/,
  });
});

test('allows unrelated index arithmetic outside AnnualStageRail', async () => {
  const fixtureRoot = createFixture({
    relativeSourcePath: 'components/Pagination.tsx',
    source: `
      export function Pagination({ pagination }) {
        return <span>{pagination.index + 1}</span>;
      }
    `,
  });

  assert.deepEqual(
    await findWorkbenchGovernanceViolations(fixtureRoot),
    [],
  );
});

test('rejects YunQiYearDto imports in annual component source', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/AnnualDtoView.tsx',
    source: `
      import type { YunQiYearDto } from '@yunqi/contracts';
      export function AnnualDtoView({ dto }: { dto: YunQiYearDto }) {
        return <span>{dto.year}</span>;
      }
    `,
    expected:
      /AnnualDtoView\.tsx: frozen DTO imports from @yunqi\/contracts are forbidden in component source/,
  });
});

test('rejects direct getYear capability access in annual component source', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/AnnualClientView.tsx',
    source: `
      export function AnnualClientView({ client }) {
        return <button onClick={() => client.getYear(2026)}>Load</button>;
      }
    `,
    expected:
      /AnnualClientView\.tsx: direct YunQi client method access is forbidden/,
  });
});

for (const identifier of ['currentStep', 'completed', 'upcoming']) {
  test(`rejects ${identifier} identifiers in annual component source`, async () => {
    await assertMutationRejected({
      relativeSourcePath:
        'features/yunqi/year-analysis/components/AnnualSemantics.tsx',
      source: `
        export function AnnualSemantics({ stages }) {
          const ${identifier} = stages[0];
          return <span>{${identifier}.name}</span>;
        }
      `,
      expected: new RegExp(
        `AnnualSemantics\\.tsx: annual component identifier ${identifier} is forbidden`,
      ),
    });
  });
}

for (const literal of [
  '当前',
  '已结束',
  '未开始',
  '吉凶',
  '诊断',
  '治疗',
]) {
  test(`rejects ${literal} user-facing copy in annual component source`, async () => {
    await assertMutationRejected({
      relativeSourcePath:
        'features/yunqi/year-analysis/components/AnnualCopy.tsx',
      source: `export function AnnualCopy() { return <p>${literal}</p>; }`,
      expected: new RegExp(
        `AnnualCopy\\.tsx: annual component user-facing literal ${literal} is forbidden`,
      ),
    });
  });
}

test('rejects rebuilding annual stage index from callback position', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/AnnualStageList.tsx',
    source: `
      export function AnnualStageList({ stages }) {
        const rebuilt = stages.map((step, position) => ({
          ...step,
          index: position + 1,
        }));
        return rebuilt.map((stage) => <span key={stage.index}>{stage.name}</span>);
      }
    `,
    expected:
      /AnnualStageList\.tsx: annual stage index must preserve the API stage index/,
  });
});

test('rejects selecting an annual stage by ordinal array position', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/AnnualSelection.tsx',
    source: `
      export function AnnualSelection({ stages, selectedStepIndex }) {
        const selected = stages[selectedStepIndex - 1];
        return <span>{selected.name}</span>;
      }
    `,
    expected:
      /AnnualSelection\.tsx: annual stage selection must match the API stage index/,
  });
});

for (const boundary of [1901, 2099]) {
  test(`rejects duplicated ${boundary} year boundary in YearSelector`, async () => {
    await assertMutationRejected({
      relativeSourcePath:
        'features/yunqi/year-analysis/components/YearSelector.tsx',
      source: `
        import { YUNQI_YEAR_OPTIONS } from '../../../../lib/yunqi-year-range';
        const copiedBoundary = ${boundary};
        export function YearSelector() {
          return <span>{YUNQI_YEAR_OPTIONS.length + copiedBoundary}</span>;
        }
      `,
      expected: new RegExp(
        `YearSelector\\.tsx: duplicated YunQi year boundary ${boundary} is forbidden`,
      ),
    });
  });
}

test('requires YearSelector to import the canonical year options', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/YearSelector.tsx',
    source: `
      const yearOptions = [2026];
      export function YearSelector() {
        return <span>{yearOptions.length}</span>;
      }
    `,
    expected:
      /YearSelector\.tsx: must import YUNQI_YEAR_OPTIONS from lib\/yunqi-year-range/,
  });
});

test('rejects array map in mapSixQiStageTuple', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step) { return step; }
      export function mapSixQiStageTuple(steps) {
        return steps.map(mapSixQiStage);
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStageTuple must preserve the six-item tuple without \.map\(\)/,
  });
});

test('rejects assigning mapped stage index from tuple position', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step, position) {
        return { ...step, index: position + 1 };
      }
      export function mapSixQiStageTuple(steps) {
        const [first] = steps;
        return [mapSixQiStage(first, 0)];
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStage must preserve step\.index/,
  });
});

for (const [label, source, expected] of [
  [
    'React Router',
    "import { useNavigate } from 'react-router-dom';\nexport { useNavigate };",
    /map-annual-yunqi\.ts: React Router imports are forbidden in presentation mapper source/,
  ],
  [
    'TanStack Query',
    "import { queryOptions } from '@tanstack/react-query';\nexport { queryOptions };",
    /map-annual-yunqi\.ts: TanStack Query imports are forbidden in presentation mapper source/,
  ],
]) {
  test(`rejects ${label} imports in the annual mapper`, async () => {
    await assertMutationRejected({
      relativeSourcePath:
        'features/yunqi/presentation/map-annual-yunqi.ts',
      source,
      expected,
    });
  });
}

test('allows current-view state semantics outside annual components', async () => {
  const fixtureRoot = createFixture({
    relativeSourcePath: 'features/yunqi/components/CurrentView.tsx',
    source: `
      export function CurrentView({ currentStep, completed, upcoming }) {
        return <p>当前 {currentStep.name} 已结束 {completed} 未开始 {upcoming}</p>;
      }
    `,
  });

  assert.deepEqual(
    await findWorkbenchGovernanceViolations(fixtureRoot),
    [],
  );
});

test('allows diagnosis and treatment wording in the global safety note', async () => {
  const fixtureRoot = createFixture({
    relativeSourcePath: 'app/App.tsx',
    source: `
      export function App() {
        return <p>本系统不提供自动诊断或治疗决策。</p>;
      }
    `,
  });

  assert.deepEqual(
    await findWorkbenchGovernanceViolations(fixtureRoot),
    [],
  );
});

test('allows unrelated pagination index arithmetic in annual components', async () => {
  const fixtureRoot = createFixture({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/Pagination.tsx',
    source: `
      export function Pagination({ pagination }) {
        return <span>{pagination.index + 1}</span>;
      }
    `,
  });

  assert.deepEqual(
    await findWorkbenchGovernanceViolations(fixtureRoot),
    [],
  );
});

for (const relativeSourcePath of [
  'features/yunqi/year-analysis/components/AnnualSemantics.test.tsx',
  'features/yunqi/year-analysis/components/AnnualSemantics.fixture.tsx',
  'features/yunqi/year-analysis/components/fixtures/AnnualSemantics.tsx',
]) {
  test(`excludes annual semantics in ${relativeSourcePath}`, async () => {
    const fixtureRoot = createFixture({
      relativeSourcePath,
      source: `
        export function AnnualSemantics({ currentStep, completed, upcoming }) {
          return <p>当前 {currentStep.name} 已结束 {completed} 未开始 {upcoming} 吉凶诊断治疗</p>;
        }
      `,
    });

    assert.deepEqual(
      await findWorkbenchGovernanceViolations(fixtureRoot),
      [],
    );
  });
}

test('review bypass: rejects rendered forbidden copy through const aliases', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/AliasedCopy.tsx',
    source: `
      export function AliasedCopy() {
        const copy = '诊断';
        const alias = copy;
        return <p>{alias}</p>;
      }
    `,
    expected:
      /AliasedCopy\.tsx: annual component user-facing literal 诊断 is forbidden/,
  });
});

for (const [fragment, literal, source] of [
  [
    'head',
    '当前',
    [
      'export function TemplateCopy({ suffix }) {',
      '  const copy = `当前${suffix}`;',
      '  return <p>{copy}</p>;',
      '}',
    ].join('\n'),
  ],
  [
    'middle',
    '治疗',
    [
      'export function TemplateCopy({ prefix, suffix }) {',
      '  return <p>{`${prefix}治疗${suffix}`}</p>;',
      '}',
    ].join('\n'),
  ],
  [
    'tail',
    '吉凶',
    [
      'export function TemplateCopy({ prefix }) {',
      '  return <p>{`${prefix}吉凶`}</p>;',
      '}',
    ].join('\n'),
  ],
]) {
  test(`review bypass: rejects forbidden copy in template ${fragment}`, async () => {
    await assertMutationRejected({
      relativeSourcePath:
        'features/yunqi/year-analysis/components/TemplateCopy.tsx',
      source,
      expected: new RegExp(
        `TemplateCopy\\.tsx: annual component user-facing literal ${literal} is forbidden`,
      ),
    });
  });
}

test('review bypass: rejects aliased forbidden copy passed to a custom JSX prop', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/CustomCopy.tsx',
    source: `
      function AnnualCard() { return null; }
      export function CustomCopy() {
        const copy = '已结束';
        return <AnnualCard caption={copy} />;
      }
    `,
    expected:
      /CustomCopy\.tsx: annual component user-facing literal 已结束 is forbidden/,
  });
});

test('review round3 conservative: rejects forbidden literals anywhere in annual source', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/DebugButton.tsx',
    source: `
      export function DebugButton() {
        return <button onClick={() => console.debug('诊断治疗')}>Log</button>;
      }
    `,
    expected:
      /DebugButton\.tsx: annual component user-facing literal 诊断 is forbidden/,
  });
});

test('review bypass: rejects named stage callbacks through a collection alias', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/AliasedStages.tsx',
    source: `
      function rebuild(stage, position) {
        return { ...stage, index: position + 1 };
      }
      export function AliasedStages({ stages }) {
        const list = stages;
        const rebuilt = list.map(rebuild);
        return rebuilt.map((stage) => <span>{stage.index}</span>);
      }
    `,
    expected:
      /AliasedStages\.tsx: annual stage index must preserve the API stage index/,
  });
});

test('review bypass: rejects ordinal selection through collection and index aliases', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/AliasedSelection.tsx',
    source: `
      export function AliasedSelection({ stages, selectedStepIndex }) {
        const list = stages;
        const chosen = selectedStepIndex;
        const selected = list[chosen - 1];
        return <span>{selected.name}</span>;
      }
    `,
    expected:
      /AliasedSelection\.tsx: annual stage selection must match the API stage index/,
  });
});

test('review bypass: rejects parenthesized tuple map callees', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step) { return step; }
      export function mapSixQiStageTuple(steps) {
        return ((steps.map))(mapSixQiStage);
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStageTuple must preserve the six-item tuple without \.map\(\)/,
  });
});

test('review bypass: rejects statically concatenated tuple map access', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step) { return step; }
      export function mapSixQiStageTuple(steps) {
        return steps['m' + 'ap'](mapSixQiStage);
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStageTuple must preserve the six-item tuple without \.map\(\)/,
  });
});

for (const [form, declaration] of [
  [
    'arrow',
    `export const mapSixQiStageTuple = (steps) =>
      steps.map(mapSixQiStage);`,
  ],
  [
    'function expression',
    `export const mapSixQiStageTuple = function (steps) {
      return steps.map(mapSixQiStage);
    };`,
  ],
]) {
  test(`review bypass: rejects tuple map in a variable ${form}`, async () => {
    await assertMutationRejected({
      relativeSourcePath:
        'features/yunqi/presentation/map-yunqi-shared.ts',
      source: `
        function mapSixQiStage(step) { return step; }
        ${declaration}
      `,
      expected:
        /map-yunqi-shared\.ts: mapSixQiStageTuple must preserve the six-item tuple without \.map\(\)/,
    });
  });
}

test('review round3 canonical: rejects every nested tuple helper', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step) { return step; }
      export function mapSixQiStageTuple(steps) {
        function mapLabels(values) {
          return values.map((value) => value.label);
        }
        void mapLabels;
        const [first, second, third, fourth, fifth, sixth] = steps;
        return [first, second, third, fourth, fifth, sixth].mapSixQiStage;
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStageTuple must preserve the six-item tuple without \.map\(\)/,
  });
});

test('review bypass: rejects tuple position taint propagated through assignment', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step, position) {
        let mappedIndex = step.index;
        mappedIndex = position + 1;
        return { ...step, index: mappedIndex };
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStage must preserve step\.index/,
  });
});

test('review bypass: rejects tuple position taint propagated through destructuring', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step, position) {
        const [mappedIndex] = [position + 1];
        return { ...step, index: mappedIndex };
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStage must preserve step\.index/,
  });
});

test('review bypass: rejects tuple position captured by a closure', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step, position) {
        function rebuiltIndex() {
          return position + 1;
        }
        return { ...step, index: rebuiltIndex() };
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStage must preserve step\.index/,
  });
});

test('review bypass: rejects tuple position in an arrow mapSixQiStage', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      const mapSixQiStage = (step, position) => ({
        ...step,
        index: position + 1,
      });
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStage must preserve step\.index/,
  });
});

test('review round3 canonical: rejects an aliased mapSixQiStage index', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step, position) {
        const safeIndex = ((position) => position)(step.index);
        return { ...step, index: safeIndex };
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStage must preserve step\.index/,
  });
});

test('review allow: excludes annual semantics under __tests__ directories', async () => {
  const fixtureRoot = createFixture({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/__tests__/AnnualCopy.tsx',
    source: `
      export function AnnualCopy({ currentStep }) {
        return <p>当前 {currentStep.name} 诊断治疗</p>;
      }
    `,
  });

  assert.deepEqual(
    await findWorkbenchGovernanceViolations(fixtureRoot),
    [],
  );
});

for (const [label, source] of [
  [
    'type-only import',
    `
      import type { YUNQI_YEAR_OPTIONS } from '../../../../lib/yunqi-year-range';
      export function YearSelector() { return <span>{String(YUNQI_YEAR_OPTIONS)}</span>; }
    `,
  ],
  [
    'aliased import placeholder',
    `
      import { YUNQI_YEAR_OPTIONS as approvedOptions } from '../../../../lib/yunqi-year-range';
      export function YearSelector() { return <span>{approvedOptions.length}</span>; }
    `,
  ],
  [
    'approximate import path',
    `
      import { YUNQI_YEAR_OPTIONS } from '../../../../fake/lib/yunqi-year-range';
      export function YearSelector() { return <span>{YUNQI_YEAR_OPTIONS.length}</span>; }
    `,
  ],
]) {
  test(`review bypass: rejects YearSelector ${label}`, async () => {
    await assertMutationRejected({
      relativeSourcePath:
        'features/yunqi/year-analysis/components/YearSelector.tsx',
      source,
      expected:
        /YearSelector\.tsx: must import YUNQI_YEAR_OPTIONS from lib\/yunqi-year-range/,
    });
  });
}

test('review bypass: requires YearSelector to consume the imported binding', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/YearSelector.tsx',
    source: `
      import { YUNQI_YEAR_OPTIONS } from '../../../../lib/yunqi-year-range';
      const localOptions = [2026];
      export function YearSelector() {
        return <span>{localOptions.map(String)}</span>;
      }
    `,
    expected:
      /YearSelector\.tsx: must consume imported YUNQI_YEAR_OPTIONS/,
  });
});

test('review canonical: rejects a shadowed YearSelector options import', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/YearSelector.tsx',
    source: `
      import { YUNQI_YEAR_OPTIONS } from '../../../../lib/yunqi-year-range';
      export function YearSelector({ YUNQI_YEAR_OPTIONS }) {
        return (
          <select>
            {YUNQI_YEAR_OPTIONS.map((year) => (
              <option value={year}>{year}</option>
            ))}
          </select>
        );
      }
    `,
    expected:
      /YearSelector\.tsx: must render YUNQI_YEAR_OPTIONS directly without rebuilding/,
  });
});

test('review bypass: rejects Array.from arithmetic reconstruction without boundary literals', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/YearSelector.tsx',
    source: `
      import { YUNQI_YEAR_OPTIONS } from '../../../../lib/yunqi-year-range';
      const firstYear = YUNQI_YEAR_OPTIONS[0];
      const rebuilt = Array.from(
        { length: YUNQI_YEAR_OPTIONS.length },
        (_, offset) => firstYear + offset,
      );
      export function YearSelector() {
        return <span>{rebuilt.map(String)}</span>;
      }
    `,
    expected:
      /YearSelector\.tsx: must render YUNQI_YEAR_OPTIONS directly without rebuilding/,
  });
});

test('review round2 bypass: rejects forbidden copy in a local JSX object spread', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/SpreadCopy.tsx',
    source: `
      export function SpreadCopy() {
        const renderedProps = { title: '诊断' };
        return <section {...renderedProps} />;
      }
    `,
    expected:
      /SpreadCopy\.tsx: annual component user-facing literal 诊断 is forbidden/,
  });
});

test('review round2 bypass: rejects forbidden copy in a conditional JSX spread', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/ConditionalSpreadCopy.tsx',
    source: `
      function AnnualCard() { return null; }
      export function ConditionalSpreadCopy({ detailed }) {
        const renderedProps = detailed
          ? { caption: '治疗' }
          : { caption: '理论说明' };
        return <AnnualCard {...renderedProps} />;
      }
    `,
    expected:
      /ConditionalSpreadCopy\.tsx: annual component user-facing literal 治疗 is forbidden/,
  });
});

test('review round2 bypass: rejects tuple map returned through an invoked local helper', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step) { return step; }
      export function mapSixQiStageTuple(steps) {
        function buildTuple() {
          return steps.map(mapSixQiStage);
        }
        const result = buildTuple();
        return result;
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStageTuple must preserve the six-item tuple without \.map\(\)/,
  });
});

test('review round3 canonical: rejects an unused local tuple helper', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step) { return step; }
      export function mapSixQiStageTuple(steps) {
        function logLabels(values) {
          return values.map((value) => value.label);
        }
        void logLabels([{ label: '教学' }]);
        const [first, second, third, fourth, fifth, sixth] = steps;
        return [first, second, third, fourth, fifth, sixth];
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStageTuple must preserve the six-item tuple without \.map\(\)/,
  });
});

test('review round2 bypass: resolves an immutable const tuple map method key', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      const METHOD = 'ma' + 'p';
      function mapSixQiStage(step) { return step; }
      export function mapSixQiStageTuple(steps) {
        return steps[METHOD](mapSixQiStage);
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStageTuple must preserve the six-item tuple without \.map\(\)/,
  });
});

test('review round2 bypass: resolves an immutable const mapped index key', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      const INDEX = 'in' + 'dex';
      function mapSixQiStage(step, position) {
        return { ...step, [INDEX]: position + 1 };
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStage must preserve step\.index/,
  });
});

test('review round3 canonical: rejects a runtime tuple method key', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      const METHOD = getRuntimeMethod();
      function mapSixQiStage(step) { return step; }
      export function mapSixQiStageTuple(steps) {
        return steps[METHOD](mapSixQiStage);
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStageTuple must preserve the six-item tuple without \.map\(\)/,
  });
});

test('review round2 bypass: gives var annual collections function scope', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/VarAnnualStages.tsx',
    source: `
      export function VarAnnualStages({ stages }) {
        if (stages.length > 0) {
          var visibleStages = stages;
        }
        return visibleStages.map((stage, position) => (
          <span key={stage.index}>{position + 1}</span>
        ));
      }
    `,
    expected:
      /VarAnnualStages\.tsx: annual stage index must preserve the API stage index/,
  });
});

test('review round2 bypass: gives var mapped positions function scope', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step, position) {
        if (position >= 0) {
          var mappedIndex = position + 1;
        }
        return { ...step, index: mappedIndex };
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStage must preserve step\.index/,
  });
});

test('review round2 bypass: tracks a tainted object declaration destructuring property', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step, position) {
        const source = { value: position + 1, safe: step.index };
        const { value: mappedIndex } = source;
        return { ...step, index: mappedIndex };
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStage must preserve step\.index/,
  });
});

test('review round3 canonical: rejects object-destructured mapSixQiStage index', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step, position) {
        const source = { value: position + 1, safe: step.index };
        const { safe: mappedIndex } = source;
        return { ...step, index: mappedIndex };
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStage must preserve step\.index/,
  });
});

test('review round2 bypass: tracks a tainted object assignment destructuring property', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step, position) {
        let mappedIndex = step.index;
        ({ value: mappedIndex } = {
          value: position + 1,
          safe: step.index,
        });
        return { ...step, index: mappedIndex };
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStage must preserve step\.index/,
  });
});

test('review round3 canonical: rejects assigned mapSixQiStage index aliases', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step, position) {
        let mappedIndex = step.index;
        ({ safe: mappedIndex } = {
          value: position + 1,
          safe: step.index,
        });
        return { ...step, index: mappedIndex };
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStage must preserve step\.index/,
  });
});

test('review round3 canonical: rejects array-projected mapSixQiStage index aliases', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step, position) {
        let mappedIndex = step.index;
        [, mappedIndex] = [position + 1, step.index];
        return { ...step, index: mappedIndex };
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStage must preserve step\.index/,
  });
});

test('review round2 bypass: rejects a decoy canonical map disconnected from option children', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/YearSelector.tsx',
    source: `
      import { YUNQI_YEAR_OPTIONS } from '../../../../lib/yunqi-year-range';
      const localOptions = [2026];
      export function YearSelector() {
        return (
          <select>
            {YUNQI_YEAR_OPTIONS.map((year) => <span key={year} />)}
            {localOptions.map((year) => <option key={year}>{year}</option>)}
          </select>
        );
      }
    `,
    expected:
      /YearSelector\.tsx: must render YUNQI_YEAR_OPTIONS directly without rebuilding/,
  });
});

test('review round2 allow: ignores unrelated Array.from when canonical option children are rendered', async () => {
  const fixtureRoot = createFixture({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/YearSelector.tsx',
    source: `
      import { YUNQI_YEAR_OPTIONS } from '../../../../lib/yunqi-year-range';
      const debugSamples = Array.from({ length: 2 }, (_, index) => index);
      void debugSamples;
      export function YearSelector() {
        return (
          <select>
            {YUNQI_YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        );
      }
    `,
  });

  assert.deepEqual(
    await findWorkbenchGovernanceViolations(fixtureRoot),
    [],
  );
});

test('review round3 conservative: rejects logging-only callback ordinal arithmetic', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/OrdinalDebug.tsx',
    source: `
      export function OrdinalDebug({ stages }) {
        return stages.map((stage, position) => {
          console.debug(position + 1);
          return <span key={stage.index}>{stage.index}</span>;
        });
      }
    `,
    expected:
      /OrdinalDebug\.tsx: annual stage index must preserve the API stage index/,
  });
});

test('review round3 canonical: rejects noncanonical mapSixQiStage property mutation', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step, position) {
        let mappedIndex = step.index;
        const result = { ...step, index: mappedIndex };
        mappedIndex = position + 1;
        return result;
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStage must preserve step\.index/,
  });
});

test('review round3 conservative: rejects forbidden copy in an unrendered local helper', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/HiddenCopy.tsx',
    source: `
      function hiddenCopy() {
        return '诊断';
      }
      export function HiddenCopy() {
        void hiddenCopy;
        return <p>理论说明</p>;
      }
    `,
    expected:
      /HiddenCopy\.tsx: annual component user-facing literal 诊断 is forbidden/,
  });
});

test('review round3 conservative: rejects any plus-one inside a two-parameter map callback', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/NestedOrdinal.tsx',
    source: `
      export function NestedOrdinal({ stages }) {
        return stages.map((stage, position) => {
          const hiddenOrdinal = () => position + 1;
          void hiddenOrdinal;
          return <span key={stage.index}>{stage.index}</span>;
        });
      }
    `,
    expected:
      /NestedOrdinal\.tsx: annual stage index must preserve the API stage index/,
  });
});

test('review round3 conservative: rejects selected index minus one through Array.at', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/AtSelection.tsx',
    source: `
      export function AtSelection({ stages, selectedStepIndex }) {
        const selected = stages.at(selectedStepIndex - 1);
        return <span>{selected?.name}</span>;
      }
    `,
    expected:
      /AtSelection\.tsx: annual stage selection must match the API stage index/,
  });
});

test('review round3 canonical: requires both frozen mapper functions', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      export function mapLabels(values) {
        return values.map((value) => value.label);
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStageTuple must preserve the six-item tuple without \.map\(\)/,
  });
});

test('review round3 canonical: rejects explicit tuple mapping through a local helper', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step) {
        return { index: step.index };
      }
      export function mapSixQiStageTuple(steps) {
        const [first, second, third, fourth, fifth, sixth] = steps;
        const mapOne = (step) => mapSixQiStage(step);
        return [
          mapOne(first), mapOne(second), mapOne(third),
          mapOne(fourth), mapOne(fifth), mapOne(sixth),
        ];
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStageTuple must preserve the six-item tuple without \.map\(\)/,
  });
});

test('review round3 canonical: rejects tuple mapping through an object method', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step) {
        return { index: step.index };
      }
      export function mapSixQiStageTuple(steps) {
        const [first, second, third, fourth, fifth, sixth] = steps;
        const mapper = { run: mapSixQiStage };
        return [
          mapper.run(first), mapper.run(second), mapper.run(third),
          mapper.run(fourth), mapper.run(fifth), mapper.run(sixth),
        ];
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStageTuple must preserve the six-item tuple without \.map\(\)/,
  });
});

test('review round3 canonical: rejects an index object method in mapSixQiStage', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/presentation/map-yunqi-shared.ts',
    source: `
      function mapSixQiStage(step) {
        return {
          index() { return step.index; },
        };
      }
      export function mapSixQiStageTuple(steps) {
        const [first, second, third, fourth, fifth, sixth] = steps;
        return [
          mapSixQiStage(first), mapSixQiStage(second), mapSixQiStage(third),
          mapSixQiStage(fourth), mapSixQiStage(fifth), mapSixQiStage(sixth),
        ];
      }
    `,
    expected:
      /map-yunqi-shared\.ts: mapSixQiStage must preserve step\.index/,
  });
});

test('review round3 canonical: rejects YearSelector option content wrapped in markup', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/YearSelector.tsx',
    source: `
      import { YUNQI_YEAR_OPTIONS } from '../../../../lib/yunqi-year-range';
      export function YearSelector() {
        return (
          <select>
            {YUNQI_YEAR_OPTIONS.map((year) => (
              <option value={year}><strong>{year}</strong></option>
            ))}
          </select>
        );
      }
    `,
    expected:
      /YearSelector\.tsx: must render YUNQI_YEAR_OPTIONS directly without rebuilding/,
  });
});

test('review round3 canonical: rejects aliased YearSelector option values and children', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/YearSelector.tsx',
    source: `
      import { YUNQI_YEAR_OPTIONS } from '../../../../lib/yunqi-year-range';
      export function YearSelector() {
        return (
          <select>
            {YUNQI_YEAR_OPTIONS.map((year) => {
              const renderedYear = year;
              return <option value={renderedYear}>{renderedYear}</option>;
            })}
          </select>
        );
      }
    `,
    expected:
      /YearSelector\.tsx: must render YUNQI_YEAR_OPTIONS directly without rebuilding/,
  });
});

test('review round3 canonical: rejects aliased canonical option arrays', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/YearSelector.tsx',
    source: `
      import { YUNQI_YEAR_OPTIONS } from '../../../../lib/yunqi-year-range';
      export function YearSelector() {
        const options = YUNQI_YEAR_OPTIONS.map((year) => (
          <option value={year}>{year}</option>
        ));
        return <select>{options}</select>;
      }
    `,
    expected:
      /YearSelector\.tsx: must render YUNQI_YEAR_OPTIONS directly without rebuilding/,
  });
});

test('review round3 canonical: rejects option callbacks without a direct item value', async () => {
  await assertMutationRejected({
    relativeSourcePath:
      'features/yunqi/year-analysis/components/YearSelector.tsx',
    source: `
      import { YUNQI_YEAR_OPTIONS } from '../../../../lib/yunqi-year-range';
      export function YearSelector() {
        return (
          <select>
            {YUNQI_YEAR_OPTIONS.map((year) => <option>{year}</option>)}
          </select>
        );
      }
    `,
    expected:
      /YearSelector\.tsx: must render YUNQI_YEAR_OPTIONS directly without rebuilding/,
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
    peerDependencies: { 'unlisted-router': '1.0.0' },
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
