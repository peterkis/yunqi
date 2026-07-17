import Ajv2020 from 'ajv/dist/2020.js';
import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { buildApp } from '../src/app.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

describe('OpenAPI contract', () => {
  const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('publishes complete OpenAPI 3.1 metadata and paths', async () => {
    const app = await buildApp({
      provider: fixedCalendarProvider,
      now: () => 1_716_210_000_000,
      logger: false,
    });
    apps.push(app);
    await app.ready();
    const document = app.swagger() as Record<string, any>;

    expect(document.openapi).toBe('3.1.0');
    expect(document.info.version).toBe('1.2.0');
    expect(document['x-yunqi-contract-id']).toBe(
      'YQ-API-CONTRACT-1.0.0',
    );
    expect(Object.keys(document.paths ?? {})).toEqual(
      expect.arrayContaining([
        '/health',
        '/api/v1/yunqi/year/{year}',
        '/api/v1/yunqi/current',
        '/api/v1/yunqi/calculate',
      ]),
    );

    const errorSchema = { $ref: '#/components/schemas/ErrorResponse' };
    expect(
      document.paths['/health'].get.responses['200']
        .content['application/json'].schema,
    ).toEqual({ $ref: '#/components/schemas/HealthSuccessResponse' });
    expect(
      document.paths['/health'].get.responses['500']
        .content['application/json'].schema,
    ).toEqual(errorSchema);

    const yunqiOperations = [
      document.paths['/api/v1/yunqi/year/{year}'].get,
      document.paths['/api/v1/yunqi/current'].get,
      document.paths['/api/v1/yunqi/calculate'].post,
    ];
    for (const operation of yunqiOperations) {
      for (const statusCode of ['400', '503', '500']) {
        expect(
          operation.responses[statusCode].content['application/json'].schema,
        ).toEqual(errorSchema);
      }
    }

    const schemas = document.components.schemas;
    expect(schemas).toHaveProperty('ErrorResponse');
    expect(schemas).toHaveProperty('YunQiTimeDto');
    expect(schemas).not.toHaveProperty('YunQiCalendarTimeDto');
    expect(schemas).not.toHaveProperty('YunQiInstantDto');
    expect(schemas.YunQiCalculationDto.properties.input).toEqual({
      $ref: '#/components/schemas/YunQiTimeDto',
    });
    expect(schemas.YunQiCalculationDto.properties).not.toHaveProperty(
      'calendarTime',
    );
    expect(schemas.SixQiStepDto.properties.start).toEqual({
      $ref: '#/components/schemas/YunQiTimeDto',
    });
    expect(schemas.SixQiStepDto.properties.end).toEqual({
      $ref: '#/components/schemas/YunQiTimeDto',
    });
    expect(JSON.stringify(document)).not.toContain('Asia/Shanghai');
    expect(JSON.stringify(document)).not.toContain('"timezone"');
    expect(schemas.CalculateRequest.properties.dateTime.pattern).toBe(
      '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?(?:Z|\\+08:00)?$',
    );
    expect(schemas.CalculateRequest.examples).toEqual([
      { dateTime: '2024-05-20T21:00:00' },
      { dateTime: '2024-05-20T13:00:00Z' },
      { dateTime: '2024-05-20T21:00:00+08:00' },
    ]);
    expect(schemas.HealthSuccessResponse.examples).toEqual([
      {
        code: 'SUCCESS',
        message: '',
        data: { status: 'ok', apiVersion: 'v1' },
      },
    ]);
    expect(
      schemas.ErrorResponse.examples.map(
        (example: { code: string }) => example.code,
      ),
    ).toEqual([
      'INVALID_ARGUMENT',
      'CALENDAR_PROVIDER_UNAVAILABLE',
      'INTERNAL_ERROR',
    ]);
  });

  it('validates a live annual response against its OpenAPI schema', async () => {
    const app = await buildApp({
      provider: fixedCalendarProvider,
      now: () => 1_716_210_000_000,
      logger: false,
    });
    apps.push(app);
    await app.ready();
    const document = app.swagger() as Record<string, any>;
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/yunqi/year/2024',
    });
    const schemas = document.components.schemas;
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    const rootId = 'https://yunqi.local/openapi-contract.json';
    ajv.addSchema({
      $id: rootId,
      components: { schemas },
    });
    const responseSchema =
      document.paths['/api/v1/yunqi/year/{year}'].get.responses['200']
        .content['application/json'].schema;
    const validate = ajv.compile({
      $ref: rootId + responseSchema.$ref,
    });

    expect(validate(response.json()), JSON.stringify(validate.errors)).toBe(
      true,
    );
  });

  it('validates a live calculation response against its OpenAPI schema', async () => {
    const app = await buildApp({
      provider: fixedCalendarProvider,
      now: () => 1_716_210_000_000,
      logger: false,
    });
    apps.push(app);
    await app.ready();
    const document = app.swagger() as Record<string, any>;
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/yunqi/calculate',
      payload: { dateTime: '2024-05-20T21:00:00' },
    });
    const schemas = document.components.schemas;
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    const rootId = 'https://yunqi.local/openapi-calculation-contract.json';
    ajv.addSchema({
      $id: rootId,
      components: { schemas },
    });
    const responseSchema =
      document.paths['/api/v1/yunqi/calculate'].post.responses['200']
        .content['application/json'].schema;
    const validate = ajv.compile({
      $ref: rootId + responseSchema.$ref,
    });

    expect(validate(response.json()), JSON.stringify(validate.errors)).toBe(
      true,
    );
  });

  it('has a checked-in OpenAPI 3.1 YAML artifact', async () => {
    const source = await readFile(
      new URL('../openapi/yunqi-service.openapi.yaml', import.meta.url),
      'utf8',
    );
    const document = parse(source);

    expect(document.openapi).toBe('3.1.0');
    expect(document.info.version).toBe('1.2.0');
    expect(document['x-yunqi-contract-id']).toBe(
      'YQ-API-CONTRACT-1.0.0',
    );
    expect(document.paths).toHaveProperty('/api/v1/yunqi/calculate');
    expect(document.components.schemas).toHaveProperty('YunQiTimeDto');
    expect(document.components.schemas).not.toHaveProperty(
      'YunQiCalendarTimeDto',
    );
  });
});
