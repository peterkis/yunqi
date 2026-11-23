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
import { parse } from 'yaml';
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

const learningEndpoints = [
  ['/api/v1/yunqi/learning/current', 'get', 'getLearningCurrent'],
  ['/api/v1/yunqi/learning/calculate', 'post', 'calculateLearning'],
  ['/api/v1/yunqi/learning/birth-comparison', 'post', 'compareBirth'],
  ['/api/v1/constitution/questionnaire', 'get', 'getConstitutionQuestionnaire'],
  ['/api/v1/constitution/assess', 'post', 'assessConstitution'],
];

const learningSchemaNames = [
  'AssessmentSuccessResponse',
  'BirthComparisonDto',
  'BirthRequest',
  'BirthSuccessResponse',
  'ClassicalPassageDto',
  'ConstitutionAssessmentDto',
  'ConstitutionQuestionnaireDto',
  'ConstitutionRequest',
  'LearningRelationDto',
  'LearningSuccessResponse',
  'MovementStepDto',
  'QuestionnaireSuccessResponse',
  'YunQiLearningDto',
];

function readFrozenContract(contractId) {
  return JSON.parse(readFileSync(join(repositoryRoot,
    'packages/yunqi-contracts/contract', `${contractId}.freeze.json`), 'utf8'));
}

function readProductionDocument() {
  return parse(readFileSync(join(repositoryRoot,
    'packages/yunqi-service/openapi/yunqi-service.openapi.yaml'), 'utf8'));
}

function readFrozenDocument(contractId) {
  const frozen = readFrozenContract(contractId);
  return {
    'x-yunqi-contract-id': frozen.contractId,
    openapi: frozen.openapi,
    info: { version: frozen.documentVersion },
    paths: frozen.paths,
    components: { schemas: frozen.schemas },
  };
}

test('Contract 1.1.0 changes only the approved year range and version identity', () => {
  const contractDirectory = join(
    repositoryRoot,
    'packages/yunqi-contracts/contract',
  );
  const previous = JSON.parse(readFileSync(
    join(contractDirectory, 'YQ-API-CONTRACT-1.0.0.freeze.json'),
    'utf8',
  ));
  const expected = structuredClone(previous);
  expected.contractId = 'YQ-API-CONTRACT-1.1.0';
  expected.documentVersion = '1.3.0';

  const approvedYearSchemas = [
    expected.paths['/api/v1/yunqi/year/{year}'].get.parameters[0].schema,
    expected.schemas.YunQiYearDto.properties.year,
    expected.schemas.YunQiCalculationDto.properties.year,
  ];
  for (const schema of approvedYearSchemas) {
    assert.equal(schema.minimum, 1901);
    assert.equal(schema.maximum, 2099);
    schema.minimum = 1900;
    schema.maximum = 2100;
  }

  const actual = JSON.parse(readFileSync(
    join(contractDirectory, 'YQ-API-CONTRACT-1.1.0.freeze.json'),
    'utf8',
  ));
  assert.deepEqual(actual, expected);

  const registry = JSON.parse(readFileSync(
    join(contractDirectory, 'registry.json'),
    'utf8',
  ));
  assert.ok(registry.contractIds.includes(previous.contractId));
  assert.ok(registry.contractIds.includes(actual.contractId));
});

test('Contract 1.2.0 freezes all five added endpoints and exactly their new reachable schemas', () => {
  const previous = readFrozenContract('YQ-API-CONTRACT-1.1.0');
  const frozen = readFrozenContract('YQ-API-CONTRACT-1.2.0');
  const production = createContractProjection(readFrozenDocument('YQ-API-CONTRACT-1.2.0'));

  assert.equal(frozen.contractId, 'YQ-API-CONTRACT-1.2.0');
  assert.equal(frozen.documentVersion, '1.4.0');
  assert.equal(frozen.openapi, previous.openapi);
  assert.deepEqual(Object.keys(frozen.paths).sort(), [
    ...Object.keys(previous.paths), ...learningEndpoints.map(([path]) => path),
  ].sort());
  for (const [path, method, operationId] of learningEndpoints) {
    assert.deepEqual(Object.keys(frozen.paths[path]), [method], path);
    assert.equal(frozen.paths[path][method].operationId, operationId, path);
  }
  assert.deepEqual(Object.keys(frozen.schemas).filter((name) => !(name in previous.schemas)).sort(),
    [...learningSchemaNames].sort());
  assertContractProjectionMatchesFreeze(frozen, production);

  const registry = JSON.parse(readFileSync(join(repositoryRoot,
    'packages/yunqi-contracts/contract/registry.json'), 'utf8'));
  assert.deepEqual(registry.contractIds, [
    'YQ-API-CONTRACT-1.0.0', 'YQ-API-CONTRACT-1.1.0', 'YQ-API-CONTRACT-1.2.0',
    'YQ-API-CONTRACT-1.3.0', 'YQ-API-CONTRACT-1.4.0',
  ]);
});

test('Contract 1.2.0 preserves every legacy path, operation and schema from 1.1.0 exactly', () => {
  const previous = readFrozenContract('YQ-API-CONTRACT-1.1.0');
  const frozen = readFrozenContract('YQ-API-CONTRACT-1.2.0');
  const production = createContractProjection(readFrozenDocument('YQ-API-CONTRACT-1.2.0'));

  assert.equal(Object.keys(previous.paths).length, 3);
  for (const [path, pathItem] of Object.entries(previous.paths)) {
    assert.deepEqual(frozen.paths[path], pathItem, `frozen legacy path ${path}`);
    assert.deepEqual(production.paths[path], pathItem, `production legacy path ${path}`);
  }
  for (const [name, schema] of Object.entries(previous.schemas)) {
    assert.deepEqual(frozen.schemas[name], schema, `frozen legacy schema ${name}`);
    assert.deepEqual(production.schemas[name], schema, `production legacy schema ${name}`);
  }
});

test('Contract 1.3.0 changes only the approved stage fields and version identity from 1.2.0', () => {
  const previous = readFrozenContract('YQ-API-CONTRACT-1.2.0');
  const expected = structuredClone(previous);
  expected.contractId = 'YQ-API-CONTRACT-1.3.0';
  expected.documentVersion = '1.5.0';
  expected.schemas.SixQiBoundaryTerm = {
    anyOf: ['大寒', '春分', '小满', '大暑', '秋分', '小雪'].map((term) => ({
      enum: [term], type: 'string',
    })),
  };
  expected.schemas.StageProgressDto = {
    type: 'object', additionalProperties: false,
    required: ['elapsedRatio', 'endsOnInputDate', 'remainingCalendarDays'],
    properties: {
      elapsedRatio: { type: 'number', minimum: 0, exclusiveMaximum: 1 },
      remainingCalendarDays: { type: 'integer', minimum: 0 },
      endsOnInputDate: { type: 'boolean' },
    },
  };
  expected.schemas.MovementRelationDto = structuredClone(previous.schemas.HostGuestRelationDto);
  delete expected.schemas.MovementRelationDto.properties.qiRelation;
  expected.schemas.MovementRelationDto.required = ['direction', 'elementRelation', 'traditionalLabel'];
  const additions = {
    SixQiStepDto: {
      startTerm: { $ref: '#/components/schemas/SixQiBoundaryTerm' },
      endTerm: { $ref: '#/components/schemas/SixQiBoundaryTerm' },
    },
    YunQiCalculationDto: { currentStepProgress: { $ref: '#/components/schemas/StageProgressDto' } },
    MovementStepDto: {
      relation: { $ref: '#/components/schemas/MovementRelationDto' },
      startLabel: { type: 'string' }, endLabel: { type: 'string' },
    },
    YunQiLearningDto: { currentMovementProgress: { $ref: '#/components/schemas/StageProgressDto' } },
  };
  for (const [name, properties] of Object.entries(additions)) {
    Object.assign(expected.schemas[name].properties, properties);
    expected.schemas[name].required.push(...Object.keys(properties));
    expected.schemas[name].required.sort();
  }
  const frozen = readFrozenContract('YQ-API-CONTRACT-1.3.0');
  assert.deepEqual(frozen, expected);
  assertContractProjectionMatchesFreeze(frozen, createContractProjection(readFrozenDocument(frozen.contractId)));
});

test('Contract 1.4 adds only birth preview and annual comparison to 1.3', () => {
  const previous = readFrozenContract('YQ-API-CONTRACT-1.3.0');
  const frozen = readFrozenContract('YQ-API-CONTRACT-1.4.0');
  for (const [name, schema] of Object.entries(previous.schemas)) assert.deepEqual(frozen.schemas[name], schema);
  for (const [path, operation] of Object.entries(previous.paths)) assert.deepEqual(frozen.paths[path], operation);
  assert.deepEqual(Object.keys(frozen.paths).filter(path => !(path in previous.paths)).sort(),
    ['/api/v1/yunqi/learning/birth-date-preview', '/api/v1/yunqi/learning/birth-year-comparison']);
  assertContractProjectionMatchesFreeze(frozen, createContractProjection(readProductionDocument()));
});

for (const version of ['1.2.0', '1.3.0', '1.4.0']) {
  const contractId = `YQ-API-CONTRACT-${version}`;
  const currentDocument = () => version === '1.4.0'
    ? readProductionDocument() : readFrozenDocument(contractId);

test(`Contract ${version} requires every added path instead of silently projecting only the legacy API`, () => {
  const document = currentDocument();
  for (const [path] of learningEndpoints) {
    const changed = structuredClone(document);
    delete changed.paths[path];
    assert.throws(() => createContractProjection(changed),
      (error) => error instanceof Error && error.message.includes(`business path missing: ${path}`), path);
  }
});

test(`Contract ${version} detects missing methods and operation identity drift on every added endpoint`, () => {
  const document = currentDocument();
  const frozen = readFrozenContract(contractId);
  assertContractProjectionMatchesFreeze(frozen, createContractProjection(document));
  for (const [path, method] of learningEndpoints) {
    const removed = structuredClone(document);
    delete removed.paths[path][method];
    assert.throws(() => assertContractProjectionMatchesFreeze(frozen, createContractProjection(removed)),
      /frozen projection changed/i, `removed ${method} ${path}`);
    const renamed = structuredClone(document);
    renamed.paths[path][method].operationId += 'Changed';
    assert.throws(() => assertContractProjectionMatchesFreeze(frozen, createContractProjection(renamed)),
      /frozen projection changed/i, `renamed ${method} ${path}`);
  }
});

test(`Contract ${version} detects drift in every new reachable schema`, () => {
  const document = currentDocument();
  const frozen = readFrozenContract(contractId);
  assertContractProjectionMatchesFreeze(frozen, createContractProjection(document));
  const newObjectSchemas = version === '1.3.0' ? ['MovementRelationDto', 'StageProgressDto'] : [];
  for (const name of [...learningSchemaNames, ...newObjectSchemas]) {
    const changed = structuredClone(document);
    const schema = changed.components.schemas[name];
    assert.equal(schema.type, 'object', name);
    schema.properties.freezeMutationProbe = { type: 'boolean' };
    const projection = createContractProjection(changed);
    assert.throws(() => assertContractProjectionMatchesFreeze(frozen, projection),
      /frozen projection changed/i, name);
    assert.throws(() => assertFreezeMayBeWritten(frozen, projection),
      /Contract ID.*unchanged/i, name);
  }
});

test(`Contract ${version} protects birth precision, questionnaire answers, movement bounds and source fields`, () => {
  const document = currentDocument();
  const frozen = readFrozenContract(contractId);
  assertContractProjectionMatchesFreeze(frozen, createContractProjection(document));
  const mutations = [
    ['birth date required', (doc) => { doc.components.schemas.BirthRequest.required = []; }],
    ['birth time grammar', (doc) => { doc.components.schemas.BirthRequest.properties.birthTime.pattern = '.*'; }],
    ['birth precision enum', (doc) => { doc.components.schemas.BirthComparisonDto.properties.birthPrecision.anyOf.push({ type: 'string', enum: ['unknown'] }); }],
    ['closed request object', (doc) => { doc.components.schemas.BirthRequest.additionalProperties = true; }],
    ['five movement count', (doc) => { doc.components.schemas.YunQiLearningDto.properties.movements.maxItems = 6; }],
    ['movement index', (doc) => { doc.components.schemas.MovementStepDto.properties.index.maximum = 6; }],
    ['questionnaire version', (doc) => { doc.components.schemas.ConstitutionQuestionnaireDto.properties.id.enum.push('another-version'); }],
    ['answer lower bound', (doc) => { doc.components.schemas.ConstitutionRequest.properties.answers.additionalProperties.minimum = 0; }],
    ['answer integer type', (doc) => { doc.components.schemas.ConstitutionRequest.properties.answers.additionalProperties.type = 'number'; }],
    ['relation sources required', (doc) => { doc.components.schemas.LearningRelationDto.required = doc.components.schemas.LearningRelationDto.required.filter((field) => field !== 'sources'); }],
    ['classical quote type', (doc) => { doc.components.schemas.ClassicalPassageDto.properties.quote.type = 'number'; }],
  ];
  for (const [name, mutate] of mutations) {
    const changed = structuredClone(document);
    mutate(changed);
    assert.throws(() => assertContractProjectionMatchesFreeze(frozen, createContractProjection(changed)),
      /frozen projection changed/i, name);
  }
});
}

test('Contract 1.3.0 freezes stage required fields, progress constraints and the six-term boundary enum', () => {
  const document = readFrozenDocument('YQ-API-CONTRACT-1.3.0');
  const frozen = readFrozenContract('YQ-API-CONTRACT-1.3.0');
  assertContractProjectionMatchesFreeze(frozen, createContractProjection(document));
  const mutations = [
    (schemas) => { schemas.SixQiBoundaryTerm.anyOf.push({ type: 'string', enum: ['芒种'] }); },
    (schemas) => { schemas.StageProgressDto.properties.elapsedRatio.minimum = -1; },
    (schemas) => { delete schemas.StageProgressDto.properties.elapsedRatio.exclusiveMaximum; },
    (schemas) => { schemas.StageProgressDto.properties.remainingCalendarDays.type = 'number'; },
    (schemas) => { schemas.StageProgressDto.properties.remainingCalendarDays.minimum = -1; },
    (schemas) => { schemas.MovementRelationDto.properties.qiRelation = { type: 'string' }; },
  ];
  for (const name of ['SixQiStepDto', 'MovementStepDto', 'YunQiCalculationDto', 'YunQiLearningDto', 'MovementRelationDto', 'StageProgressDto']) {
    mutations.push((schemas) => { schemas[name].additionalProperties = true; });
    for (const field of document.components.schemas[name].required) {
      mutations.push((schemas) => {
        schemas[name].required = schemas[name].required.filter((value) => value !== field);
      });
    }
  }
  for (const mutate of mutations) {
    const changed = structuredClone(document);
    mutate(changed.components.schemas);
    assert.throws(() => assertContractProjectionMatchesFreeze(frozen, createContractProjection(changed)),
      /frozen projection changed/i);
    assert.throws(() => assertFreezeMayBeWritten(frozen, createContractProjection(changed)),
      /Contract ID.*unchanged/i);
  }
});

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
  writeFixture(root, 'packages/yunqi-domain/package.json', JSON.stringify({
    name: '@yunqi/domain', dependencies: {},
  }));
  writeFixture(root, 'packages/calendar-adapters/tyme4ts/package.json', JSON.stringify({
    name: '@yunqi/calendar-adapter-tyme4ts', dependencies: { '@yunqi/domain': 'workspace:*' },
  }));
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

test('dependency gate allows ordinary module-related text without loader access', async () => {
  const root = createDependencyFixture();
  writeFixture(root, 'packages/yunqi-service/src/labels.ts', "export const label = 'module'; export const example = 'node:module';");
  assert.deepEqual(await findContractDependencyViolations(root), []);
});

for (const source of [
  "export const load = () => import('@yunqi/' + 'client');",
  "const id = '@yunqi/client'; export const load = () => import(id);",
  "const load = require; export const client = load('@yunqi/client');",
  "import { createRequire as factory } from 'node:module'; const load = factory(import.meta.url); load('@yunqi/client');",
  "export const load = Function('return import(\"@yunqi/client\")');",
]) {
  test(`dependency gate rejects opaque capability acquisition: ${source}`, async () => {
    const root = createDependencyFixture();
    writeFixture(root, 'packages/yunqi-service/src/opaque.ts', source);
    const violations = await findContractDependencyViolations(root);
    assert.ok(violations.some((v) => v.includes('opaque.ts')), violations.join('\n'));
  });
}

test('dependency gate rejects a template literal reverse import', async () => {
  const root = createDependencyFixture();
  writeFixture(root, 'packages/yunqi-domain/src/leak.ts',
    'export const load = () => import(`../../yunqi-client/dist/index.js`);');
  const violations = await findContractDependencyViolations(root);
  assert.ok(violations.some((value) => value.includes('packages/yunqi-domain/src/leak.ts')));
});

test('dependency gate rejects a client relative import of Service runtime', async () => {
  const root = createDependencyFixture();
  writeFixture(
    root,
    'packages/yunqi-client/src/leak.ts',
    "export { buildApp } from '../../yunqi-service/dist/app.js';",
  );
  const violations = await findContractDependencyViolations(root);
  assert.ok(violations.some((value) => value.includes('packages/yunqi-client/src/leak.ts')));
});

for (const packagePath of ['packages/yunqi-domain', 'packages/calendar-adapters/tyme4ts']) {
  test(`dependency gate rejects reverse dependencies from ${packagePath}`, async () => {
    const root = createDependencyFixture();
    writeFixture(root, `${packagePath}/package.json`, JSON.stringify({
      dependencies: { '@yunqi/client': 'workspace:*' },
    }));
    writeFixture(root, `${packagePath}/src/leak.ts`,
      "export { yunqiClient } from '@yunqi/client';");
    const violations = await findContractDependencyViolations(root);
    assert.ok(violations.some((value) => value.includes(`${packagePath}/package.json`)));
    assert.ok(violations.some((value) => value.includes(`${packagePath}/src/leak.ts`)));
  });
}

for (const [label, source] of [
  ['dynamic import', "export const load = () => import('../../yunqi-service/dist/app.js');"],
  ['commented dynamic import', "export const load = () => import(/* service */ '../../yunqi-service/dist/app.js');"],
  ['template dynamic import', 'export const load = () => import(`../../yunqi-service/dist/app.js`);'],
  ['TypeScript generic loader', "export const load = <T>() => import('../../yunqi-service/dist/app.js');"],
  ['require', "const service = require('../../yunqi-service/dist/app.js');"],
  ['Windows relative path', String.raw`export { buildApp } from '..\\..\\yunqi-service\\dist\\app.js';`],
  ['absolute path', "export { buildApp } from '/packages/yunqi-service/dist/app.js';"],
  ['file URL', "export { buildApp } from 'file:///packages/yunqi-service/dist/app.js';"],
]) {
  test(`dependency gate rejects browser package escape via ${label}`, async () => {
    const root = createDependencyFixture();
    writeFixture(root, 'packages/yunqi-client/src/leak.ts', source);
    const violations = await findContractDependencyViolations(root);
    assert.ok(violations.some((value) => value.includes('packages/yunqi-client/src/leak.ts')));
  });
}

test('dependency gate ignores import examples in comments and strings', async () => {
  const root = createDependencyFixture();
  writeFixture(root, 'packages/yunqi-client/src/example.ts',
    '// import { buildApp } from "../../yunqi-service/dist/app.js";\n' +
    'export const example = "import(\'../../yunqi-service/dist/app.js\')";');
  assert.deepEqual(await findContractDependencyViolations(root), []);
});

test('dependency gate accepts internal relative imports and rejects local reverse imports', async () => {
  const root = createDependencyFixture();
  writeFixture(root, 'packages/yunqi-client/src/nested/internal.ts', "export { value } from '../value.js';");
  assert.deepEqual(await findContractDependencyViolations(root), []);
  for (const [packagePath, specifier] of [
    ['packages/yunqi-service', '../../yunqi-client/dist/index.js'],
    ['packages/yunqi-domain', '../../yunqi-contracts/dist/index.js'],
    ['packages/calendar-adapters/tyme4ts', '../../../yunqi-client/dist/index.js'],
  ]) {
    writeFixture(root, `${packagePath}/src/leak.ts`, `export * from '${specifier}';`);
    const violations = await findContractDependencyViolations(root);
    assert.ok(violations.some((value) => value.includes(`${packagePath}/src/leak.ts`)));
  }
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
    'actions/checkout@',
    'fetch-depth: 0',
    'pnpm/action-setup@',
    'actions/setup-node@',
    'node-version: 22',
    'pnpm install --frozen-lockfile',
    'pnpm test:project-guidance',
    'pnpm test:time-governance',
    'pnpm contracts:check',
    'pnpm test',
    'pnpm typecheck',
    'pnpm test:coverage',
    'pnpm schema:validate',
    'pnpm exec playwright install --with-deps chromium',
    'pnpm test:browser',
  ];

  for (const marker of requiredMarkers) {
    assert.ok(workflow.includes(marker), `missing ${marker}`);
  }

  const orderedCommands = [
    'pnpm install --frozen-lockfile',
    'pnpm test:project-guidance',
    'pnpm test:time-governance',
    'pnpm contracts:check',
    'pnpm test',
    'pnpm typecheck',
    'pnpm test:coverage',
    'pnpm schema:validate',
    'pnpm exec playwright install --with-deps chromium',
    'pnpm test:browser',
  ];
  const actualCommands = workflow
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('run: '))
    .map((line) => line.slice('run: '.length));
  assert.deepEqual(actualCommands, orderedCommands);
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if ('uses' in node) {
      assert.match(node.uses, /^(?:\.\/[^@]+|[^@\s]+@[a-f0-9]{40})$/, `mutable action: ${node.uses}`);
    }
    for (const value of Object.values(node)) visit(value);
  };
  visit(parse(workflow));
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
