import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import {
  generateYunQiContractArtifacts,
  repositoryRoot,
} from './yunqi-contract-generation.mjs';
import {
  assertContractProjectionMatchesFreeze,
  assertRegistryPreservesHistory,
  assertRegisteredContractBaselineState,
  createContractProjection,
  findHistoricalBaselineContentViolations,
  findRegistryBaselineViolations,
} from './yunqi-contract-projection.mjs';
import {
  readContractBaselines,
  readHistoricalContractBaselines,
  readHistoricalContractIds,
} from './yunqi-contract-registry.mjs';
import {
  findContractDependencyViolations,
} from './check-yunqi-contract-dependencies.mjs';

const trackedYaml = resolve(
  repositoryRoot,
  'packages/yunqi-service/openapi/yunqi-service.openapi.yaml',
);
const trackedTypes = resolve(
  repositoryRoot,
  'packages/yunqi-contracts/src/generated/openapi.ts',
);
const freezeDirectory = resolve(
  repositoryRoot,
  'packages/yunqi-contracts/contract',
);
const registryPath = resolve(freezeDirectory, 'registry.json');

function assertSame(expectedPath, actualPath, message) {
  const expected = readFileSync(expectedPath);
  const actual = readFileSync(actualPath);

  if (!expected.equals(actual)) {
    throw new Error(message);
  }
}

const temporaryRoot = mkdtempSync(join(tmpdir(), 'yunqi-contract-check-'));
const temporaryYaml = join(temporaryRoot, 'yunqi-service.openapi.yaml');
const temporaryTypes = join(temporaryRoot, 'openapi.ts');

try {
  generateYunQiContractArtifacts({
    yamlOutput: temporaryYaml,
    typesOutput: temporaryTypes,
  });
  assertSame(
    trackedYaml,
    temporaryYaml,
    'OpenAPI YAML is stale; run pnpm contracts:generate',
  );
  assertSame(
    trackedTypes,
    temporaryTypes,
    'Contracts generated types are stale; run pnpm contracts:generate',
  );

  const document = parse(readFileSync(temporaryYaml, 'utf8'));
  const projection = createContractProjection(document);
  const freezePath = resolve(
    freezeDirectory,
    `${projection.contractId}.freeze.json`,
  );
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  assertRegistryPreservesHistory(
    registry,
    readHistoricalContractIds(repositoryRoot, registryPath),
  );
  const currentBaselines = readContractBaselines(freezeDirectory);
  const baselineViolations = [
    ...findRegistryBaselineViolations(registry, currentBaselines),
    ...findHistoricalBaselineContentViolations(
      currentBaselines,
      readHistoricalContractBaselines(
        repositoryRoot,
        freezeDirectory,
        registry.contractIds,
      ),
    ),
  ];
  if (baselineViolations.length > 0) {
    throw new Error(baselineViolations.join('\n'));
  }
  const registered = assertRegisteredContractBaselineState(
    registry,
    projection.contractId,
    existsSync(freezePath),
  );
  if (!registered) {
    throw new Error(
      `Current Contract ID ${projection.contractId} is not registered`,
    );
  }
  const expectedFreeze = JSON.parse(readFileSync(freezePath, 'utf8'));
  assertContractProjectionMatchesFreeze(expectedFreeze, projection);

  const dependencyViolations =
    await findContractDependencyViolations(repositoryRoot);
  if (dependencyViolations.length > 0) {
    throw new Error(dependencyViolations.join('\n'));
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
