import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateOpenApi } from './generate-openapi.mjs';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const trackedYaml = resolve(
  packageRoot,
  'openapi/yunqi-service.openapi.yaml',
);
const trackedTypes = resolve(
  packageRoot,
  'src/contracts/generated-client.ts',
);
const temporaryRoot = await mkdtemp(join(tmpdir(), 'yunqi-openapi-'));
const temporaryYaml = join(temporaryRoot, 'yunqi-service.openapi.yaml');
const temporaryTypes = join(temporaryRoot, 'generated-client.ts');

async function assertSame(expectedPath, actualPath, staleMessage) {
  const [expected, actual] = await Promise.all([
    readFile(expectedPath),
    readFile(actualPath),
  ]);

  if (!expected.equals(actual)) {
    throw new Error(staleMessage);
  }
}

try {
  await generateOpenApi(temporaryYaml);
  const openapiTypescript = resolve(
    packageRoot,
    'scripts/run-openapi-typescript.mjs',
  );
  const generated = spawnSync(
    process.execPath,
    [
      openapiTypescript,
      temporaryYaml,
      '--output',
      temporaryTypes,
      '--immutable',
      '--alphabetize',
    ],
    {
      cwd: packageRoot,
      encoding: 'utf8',
    },
  );

  if (generated.error) {
    throw generated.error;
  }

  if (generated.status !== 0) {
    throw new Error(generated.stderr || generated.stdout);
  }

  await assertSame(
    trackedYaml,
    temporaryYaml,
    'OpenAPI YAML is stale; run pnpm openapi:generate',
  );
  await assertSame(
    trackedTypes,
    temporaryTypes,
    'Generated client types are stale; run pnpm openapi:generate',
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
