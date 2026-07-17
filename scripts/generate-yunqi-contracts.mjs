import { resolve } from 'node:path';
import {
  generateYunQiContractArtifacts,
  repositoryRoot,
} from './yunqi-contract-generation.mjs';

generateYunQiContractArtifacts({
  yamlOutput: resolve(
    repositoryRoot,
    'packages/yunqi-service/openapi/yunqi-service.openapi.yaml',
  ),
  typesOutput: resolve(
    repositoryRoot,
    'packages/yunqi-contracts/src/generated/openapi.ts',
  ),
});
