import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
);
const serviceRoot = resolve(
  repositoryRoot,
  'packages/yunqi-service',
);

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

export function generateYunQiContractArtifacts({
  yamlOutput,
  typesOutput,
}) {
  mkdirSync(dirname(yamlOutput), { recursive: true });
  mkdirSync(dirname(typesOutput), { recursive: true });

  runNode([
    resolve(serviceRoot, 'scripts/generate-openapi.mjs'),
    yamlOutput,
  ]);
  runNode([
    resolve(serviceRoot, 'scripts/run-openapi-typescript.mjs'),
    yamlOutput,
    '--output',
    typesOutput,
    '--immutable',
    '--alphabetize',
  ]);
}

export { repositoryRoot };
