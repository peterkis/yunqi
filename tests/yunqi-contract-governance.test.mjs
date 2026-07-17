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
import {
  assertContractProjectionMatchesFreeze,
  assertFreezeMayBeWritten,
  assertRegistryPreservesHistory,
  assertRegisteredContractBaselineState,
  createContractProjection,
  findHistoricalBaselineContentViolations,
  findRegistryBaselineViolations,
  serializeContractProjection,
} from '../scripts/yunqi-contract-projection.mjs';
import {
  findContractDependencyViolations,
} from '../scripts/check-yunqi-contract-dependencies.mjs';

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
);

function createDocument() {
  const errorResponse = {
    description: 'error',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
      },
    },
  };
  const calculationResponse = {
    description: 'ok',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/CalculationSuccessResponse',
        },
      },
    },
  };

  return {
    openapi: '3.1.0',
    info: {
      title: 'YunQi',
      version: '1.2.0',
    },
    'x-yunqi-contract-id': 'YQ-API-CONTRACT-1.0.0',
    servers: [{ url: 'http://localhost:3000' }],
    paths: {
      '/health': {
        get: {
          operationId: 'getHealth',
          responses: {
            200: {
              description: 'ok',
              content: {
                'application/json': {
                  schema: { type: 'object' },
                },
              },
            },
          },
        },
      },
      '/api/v1/yunqi/year/{year}': {
        get: {
          operationId: 'getYunQiYear',
          parameters: [
            {
              in: 'path',
              name: 'year',
              required: true,
              schema: {
                type: 'integer',
                minimum: 1901,
                maximum: 2099,
              },
            },
          ],
          responses: {
            200: {
              description: 'ok',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/YearSuccessResponse',
                  },
                },
              },
            },
            400: errorResponse,
            500: errorResponse,
            503: errorResponse,
          },
        },
      },
      '/api/v1/yunqi/current': {
        get: {
          operationId: 'getCurrentYunQi',
          responses: {
            200: calculationResponse,
            400: errorResponse,
            500: errorResponse,
            503: errorResponse,
          },
        },
      },
      '/api/v1/yunqi/calculate': {
        post: {
          operationId: 'calculateYunQi',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CalculateRequest',
                },
              },
            },
          },
          responses: {
            200: calculationResponse,
            400: errorResponse,
            500: errorResponse,
            503: errorResponse,
          },
        },
      },
    },
    components: {
      schemas: {
        CalculateRequest: {
          type: 'object',
          required: ['dateTime'],
          properties: {
            dateTime: {
              type: 'string',
              pattern: '^date-time$',
            },
          },
          additionalProperties: false,
        },
        ErrorResponse: {
          type: 'object',
          required: ['code', 'message', 'details'],
          properties: {
            code: {
              enum: [
                'INVALID_ARGUMENT',
                'CALENDAR_PROVIDER_UNAVAILABLE',
                'INTERNAL_ERROR',
              ],
            },
            message: { type: 'string' },
            details: {
              type: 'object',
              additionalProperties: {},
            },
          },
          additionalProperties: false,
        },
        YearSuccessResponse: {
          type: 'object',
          required: ['code', 'message', 'data'],
          properties: {
            code: { const: 'SUCCESS' },
            message: { const: '' },
            data: { $ref: '#/components/schemas/YunQiYearDto' },
          },
          additionalProperties: false,
        },
        CalculationSuccessResponse: {
          type: 'object',
          required: ['code', 'message', 'data'],
          properties: {
            code: { const: 'SUCCESS' },
            message: { const: '' },
            data: {
              $ref: '#/components/schemas/YunQiCalculationDto',
            },
          },
          additionalProperties: false,
        },
        YunQiYearDto: {
          type: 'object',
          required: ['year', 'sixQi'],
          properties: {
            year: {
              type: 'integer',
              minimum: 1901,
              maximum: 2099,
            },
            sixQi: { $ref: '#/components/schemas/SixQiDto' },
          },
          additionalProperties: false,
        },
        YunQiCalculationDto: {
          type: 'object',
          required: ['year', 'sixQi', 'input', 'currentStep'],
          properties: {
            year: {
              type: 'integer',
              minimum: 1901,
              maximum: 2099,
            },
            sixQi: { $ref: '#/components/schemas/SixQiDto' },
            input: { $ref: '#/components/schemas/YunQiTimeDto' },
            currentStep: {
              $ref: '#/components/schemas/SixQiStepDto',
            },
          },
          additionalProperties: false,
        },
        SixQiDto: {
          type: 'object',
          required: ['steps'],
          properties: {
            steps: {
              type: 'array',
              minItems: 6,
              maxItems: 6,
              items: { $ref: '#/components/schemas/SixQiStepDto' },
            },
          },
          additionalProperties: false,
        },
        SixQiStepDto: {
          type: 'object',
          required: ['index', 'start', 'end'],
          properties: {
            index: {
              type: 'integer',
              minimum: 1,
              maximum: 6,
            },
            start: { $ref: '#/components/schemas/YunQiTimeDto' },
            end: { $ref: '#/components/schemas/YunQiTimeDto' },
          },
          additionalProperties: false,
        },
        YunQiTimeDto: {
          type: 'object',
          required: [
            'localTime',
            'epochMilliseconds',
            'offset',
            'calendarTimeStandard',
          ],
          properties: {
            localTime: {
              type: 'string',
              pattern: '^local-time$',
            },
            epochMilliseconds: {
              type: 'integer',
              minimum: Number.MIN_SAFE_INTEGER,
              maximum: Number.MAX_SAFE_INTEGER,
            },
            offset: { const: '+08:00' },
            calendarTimeStandard: {
              const: 'BeijingStandardTime+08:00',
            },
          },
          additionalProperties: false,
        },
      },
    },
  };
}

function fingerprint(document) {
  return serializeContractProjection(
    createContractProjection(document),
  );
}

test('contract projection detects every exact-freeze mutation class', () => {
  const original = createDocument();
  const baseline = fingerprint(original);
  const mutations = [
    ['field', (doc) => {
      doc.components.schemas.YunQiTimeDto.properties.note = {
        type: 'string',
      };
    }],
    ['description-named field', (doc) => {
      doc.components.schemas.YunQiTimeDto.properties.description = {
        type: 'string',
      };
    }],
    ['examples-named field', (doc) => {
      doc.components.schemas.YunQiTimeDto.properties.examples = {
        type: 'array',
        items: { type: 'string' },
      };
    }],
    ['required', (doc) => {
      doc.components.schemas.YunQiTimeDto.required.pop();
    }],
    ['enum', (doc) => {
      doc.components.schemas.ErrorResponse.properties.code.enum.push(
        'NEW_ERROR',
      );
    }],
    ['status', (doc) => {
      delete doc.paths['/api/v1/yunqi/current'].get.responses[503];
    }],
    ['schema name', (doc) => {
      doc.components.schemas.YunQiClockDto =
        doc.components.schemas.YunQiTimeDto;
      delete doc.components.schemas.YunQiTimeDto;
      const source = JSON.stringify(doc).replaceAll(
        '#/components/schemas/YunQiTimeDto',
        '#/components/schemas/YunQiClockDto',
      );
      Object.assign(doc, JSON.parse(source));
    }],
    ['validation constraint', (doc) => {
      doc.components.schemas.SixQiDto.properties.steps.maxItems = 5;
    }],
    ['additionalProperties', (doc) => {
      doc.components.schemas.YunQiTimeDto.additionalProperties = true;
    }],
  ];

  for (const [name, mutate] of mutations) {
    const changed = structuredClone(original);
    mutate(changed);
    assert.notEqual(fingerprint(changed), baseline, name);
    assert.throws(
      () =>
        assertContractProjectionMatchesFreeze(
          createContractProjection(original),
          createContractProjection(changed),
        ),
      /frozen projection changed/i,
      name,
    );
  }
});

test('contract projection ignores documentation order and health-only changes', () => {
  const original = createDocument();
  const changed = structuredClone(original);
  changed.info.description = 'new description';
  changed.servers = [{ url: 'https://api.example.test' }];
  changed.paths['/health'].get.responses[418] = {
    description: 'health-only response',
  };
  changed.components.schemas.YunQiTimeDto.description =
    'canonical fixed Beijing DTO';
  changed.components.schemas.YunQiTimeDto.example = {
    localTime: '2026-01-01T12:00:00+08:00',
  };

  assert.equal(fingerprint(changed), fingerprint(original));
});

test('freeze writer rejects a changed projection under the same Contract ID', () => {
  const original = createContractProjection(createDocument());
  const changedDocument = createDocument();
  changedDocument.components.schemas.SixQiDto.properties.steps.maxItems = 5;
  const changed = createContractProjection(changedDocument);

  assert.throws(
    () => assertFreezeMayBeWritten(original, changed),
    /Contract ID.*unchanged/i,
  );
  const tamperedId = {
    ...original,
    contractId: 'YQ-API-CONTRACT-TAMPERED',
  };
  assert.throws(
    () => assertFreezeMayBeWritten(tamperedId, changed),
    /Contract ID/i,
  );
  assert.doesNotThrow(() => assertFreezeMayBeWritten(original, original));
});

test('contract registry prevents deleting or replacing a known ID baseline', () => {
  const registry = {
    contractIds: ['YQ-API-CONTRACT-1.0.0'],
  };

  assert.equal(
    assertRegisteredContractBaselineState(
      registry,
      'YQ-API-CONTRACT-1.0.0',
      true,
    ),
    true,
  );
  assert.throws(
    () =>
      assertRegisteredContractBaselineState(
        registry,
        'YQ-API-CONTRACT-1.0.0',
        false,
      ),
    /registered.*baseline is missing/i,
  );
  assert.throws(
    () =>
      assertRegisteredContractBaselineState(
        { contractIds: [] },
        'YQ-API-CONTRACT-1.0.0',
        true,
      ),
    /unregistered.*baseline already exists/i,
  );
  assert.equal(
    assertRegisteredContractBaselineState(
      registry,
      'YQ-API-CONTRACT-2.0.0',
      false,
    ),
    false,
  );
});

test('contract registry preserves every ID found in repository history', () => {
  assert.doesNotThrow(() =>
    assertRegistryPreservesHistory(
      {
        contractIds: [
          'YQ-API-CONTRACT-1.0.0',
          'YQ-API-CONTRACT-2.0.0',
        ],
      },
      ['YQ-API-CONTRACT-1.0.0'],
    ),
  );
  assert.throws(
    () =>
      assertRegistryPreservesHistory(
        { contractIds: ['YQ-API-CONTRACT-2.0.0'] },
        ['YQ-API-CONTRACT-1.0.0'],
      ),
    /removed historical Contract ID.*1\.0\.0/i,
  );
});

test('contract registry requires every historical baseline and matching embedded ID', () => {
  const registry = {
    contractIds: [
      'YQ-API-CONTRACT-1.0.0',
      'YQ-API-CONTRACT-2.0.0',
    ],
  };
  const baselines = {
    'YQ-API-CONTRACT-1.0.0.freeze.json': {
      contractId: 'YQ-API-CONTRACT-TAMPERED',
    },
    'YQ-API-CONTRACT-UNREGISTERED.freeze.json': {
      contractId: 'YQ-API-CONTRACT-UNREGISTERED',
    },
  };
  const violations = findRegistryBaselineViolations(
    registry,
    baselines,
  );

  assert.ok(
    violations.some((value) =>
      value.includes('YQ-API-CONTRACT-2.0.0.freeze.json is missing'),
    ),
  );
  assert.ok(
    violations.some((value) =>
      value.includes('embedded Contract ID'),
    ),
  );
  assert.ok(
    violations.some((value) =>
      value.includes('unregistered baseline'),
    ),
  );
});

test('historical baseline content remains immutable after Contract ID rotation', () => {
  const historicalBaseline = createContractProjection(
    createDocument(),
  );
  const tamperedBaseline = structuredClone(historicalBaseline);
  tamperedBaseline.schemas.YunQiTimeDto.properties.localTime.pattern =
    '^tampered$';
  const currentBaselines = {
    'YQ-API-CONTRACT-1.0.0.freeze.json': tamperedBaseline,
    'YQ-API-CONTRACT-2.0.0.freeze.json': {
      contractId: 'YQ-API-CONTRACT-2.0.0',
    },
  };
  const historicalBaselines = {
    'YQ-API-CONTRACT-1.0.0.freeze.json': historicalBaseline,
  };

  assert.deepEqual(
    findHistoricalBaselineContentViolations(
      {
        'YQ-API-CONTRACT-1.0.0.freeze.json': historicalBaseline,
      },
      historicalBaselines,
    ),
    [],
  );
  assert.ok(
    findHistoricalBaselineContentViolations(
      currentBaselines,
      historicalBaselines,
    ).some((value) =>
      value.includes(
        'YQ-API-CONTRACT-1.0.0.freeze.json historical baseline content changed',
      ),
    ),
  );
});

function writeFixture(root, relativePath, source) {
  const target = join(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, source, 'utf8');
}

function createDependencyFixture() {
  const root = mkdtempSync(join(tmpdir(), 'yunqi-contract-dependencies-'));
  writeFixture(
    root,
    'packages/yunqi-contracts/package.json',
    JSON.stringify({
      name: '@yunqi/contracts',
      dependencies: {},
    }),
  );
  writeFixture(
    root,
    'packages/yunqi-contracts/src/index.ts',
    "import type { components } from './generated/openapi.js';",
  );
  writeFixture(
    root,
    'packages/yunqi-client/package.json',
    JSON.stringify({
      name: '@yunqi/client',
      dependencies: {
        '@yunqi/contracts': 'workspace:*',
      },
    }),
  );
  writeFixture(
    root,
    'packages/yunqi-client/src/index.ts',
    "import type { YunQiYearDto } from '@yunqi/contracts';",
  );
  writeFixture(
    root,
    'packages/yunqi-service/package.json',
    JSON.stringify({
      name: '@yunqi/service',
      dependencies: {
        fastify: '5.10.0',
      },
    }),
  );
  writeFixture(
    root,
    'packages/yunqi-service/src/app.ts',
    "import Fastify from 'fastify';",
  );
  return root;
}

test('dependency gate accepts the approved package direction', async () => {
  const root = createDependencyFixture();
  assert.deepEqual(await findContractDependencyViolations(root), []);
});

test('dependency gate rejects forbidden manifest and source dependencies', async () => {
  const root = createDependencyFixture();
  writeFixture(
    root,
    'packages/yunqi-contracts/package.json',
    JSON.stringify({
      name: '@yunqi/contracts',
      dependencies: {
        '@yunqi/domain': 'workspace:*',
        fastify: '5.10.0',
        react: '19.0.0',
      },
    }),
  );
  writeFixture(
    root,
    'packages/yunqi-contracts/src/leak.ts',
    "import type { YunQiCalendarTime } from '@yunqi/domain';",
  );
  writeFixture(
    root,
    'packages/yunqi-client/package.json',
    JSON.stringify({
      name: '@yunqi/client',
      dependencies: {
        '@yunqi/contracts': 'workspace:*',
        '@yunqi/service': 'workspace:*',
        axios: '1.0.0',
        '@tanstack/react-query': '5.0.0',
      },
    }),
  );
  writeFixture(
    root,
    'packages/yunqi-service/src/leak.ts',
    "import { yunqiClient } from '@yunqi/client';",
  );

  const violations = await findContractDependencyViolations(root);
  assert.ok(violations.some((value) => value.includes('@yunqi/domain')));
  assert.ok(violations.some((value) => value.includes('fastify')));
  assert.ok(violations.some((value) => value.includes('react')));
  assert.ok(violations.some((value) => value.includes('@yunqi/service')));
  assert.ok(violations.some((value) => value.includes('axios')));
  assert.ok(
    violations.some((value) => value.includes('@tanstack/react-query')),
  );
  assert.ok(violations.some((value) => value.includes('@yunqi/client')));
});

test('dependency gate passes against the production repository', async () => {
  assert.deepEqual(
    await findContractDependencyViolations(repositoryRoot),
    [],
  );
});

test('GitHub quality-gates workflow contains the required ordered gates', () => {
  const workflow = readFileSync(
    join(repositoryRoot, '.github/workflows/ci.yml'),
    'utf8',
  );
  const requiredMarkers = [
    'pull_request:',
    'push:',
    'main',
    'permissions:',
    'contents: read',
    'concurrency:',
    'cancel-in-progress: true',
    'quality-gates:',
    'actions/checkout@v7',
    'fetch-depth: 0',
    'pnpm/action-setup@v6',
    'actions/setup-node@v7',
    'node-version: 22',
    'pnpm install --frozen-lockfile',
    'pnpm test:time-governance',
    'pnpm contracts:check',
    'pnpm test',
    'pnpm typecheck',
    'pnpm test:coverage',
    'pnpm schema:validate',
  ];

  for (const marker of requiredMarkers) {
    assert.ok(workflow.includes(marker), `missing ${marker}`);
  }

  const orderedCommands = [
    'pnpm install --frozen-lockfile',
    'pnpm test:time-governance',
    'pnpm contracts:check',
    'pnpm test',
    'pnpm typecheck',
    'pnpm test:coverage',
    'pnpm schema:validate',
  ];
  const actualCommands = workflow
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('run: '))
    .map((line) => line.slice('run: '.length));
  assert.deepEqual(actualCommands, orderedCommands);
});

test('byte-compared contract artifacts are pinned to LF line endings', () => {
  const attributes = readFileSync(
    join(repositoryRoot, '.gitattributes'),
    'utf8',
  );

  for (const marker of [
    'packages/yunqi-service/openapi/*.yaml text eol=lf',
    'packages/yunqi-contracts/src/generated/*.ts text eol=lf',
    'packages/yunqi-contracts/contract/*.json text eol=lf',
  ]) {
    assert.ok(attributes.includes(marker), `missing ${marker}`);
  }
});
