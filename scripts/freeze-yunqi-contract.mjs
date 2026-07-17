import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parse } from 'yaml';
import { repositoryRoot } from './yunqi-contract-generation.mjs';
import {
  assertFreezeMayBeWritten,
  assertRegistryPreservesHistory,
  assertRegisteredContractBaselineState,
  createContractProjection,
  findHistoricalBaselineContentViolations,
  findRegistryBaselineViolations,
  serializeContractProjection,
} from './yunqi-contract-projection.mjs';
import {
  readContractBaselines,
  readHistoricalContractBaselines,
  readHistoricalContractIds,
} from './yunqi-contract-registry.mjs';

const yamlPath = resolve(
  repositoryRoot,
  'packages/yunqi-service/openapi/yunqi-service.openapi.yaml',
);
const document = parse(readFileSync(yamlPath, 'utf8'));
const projection = createContractProjection(document);
const freezeDirectory = resolve(
  repositoryRoot,
  'packages/yunqi-contracts/contract',
);
const freezePath = resolve(
  freezeDirectory,
  `${projection.contractId}.freeze.json`,
);
const registryPath = resolve(freezeDirectory, 'registry.json');
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

if (registered) {
  const existing = JSON.parse(readFileSync(freezePath, 'utf8'));
  assertFreezeMayBeWritten(existing, projection);
} else {
  mkdirSync(dirname(freezePath), { recursive: true });
  writeFileSync(
    freezePath,
    serializeContractProjection(projection),
    'utf8',
  );
  registry.contractIds.push(projection.contractId);
  writeFileSync(
    registryPath,
    `${JSON.stringify(registry, null, 2)}\n`,
    'utf8',
  );
}

console.log(`contract-freeze: ${projection.contractId}`);
