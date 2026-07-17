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
const temporaryRoot = await mkdtemp(join(tmpdir(), 'yunqi-openapi-'));
const temporaryYaml = join(temporaryRoot, 'yunqi-service.openapi.yaml');

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
  await assertSame(
    trackedYaml,
    temporaryYaml,
    'OpenAPI YAML is stale; run pnpm openapi:generate',
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
