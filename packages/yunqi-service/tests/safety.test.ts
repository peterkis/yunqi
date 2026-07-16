import { expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

const PROHIBITED =
  /诊断|疾病判断|治疗建议|个体预测|处方|方剂|中药|剂量|用药|预后|diagnos|prescri|dosage|treat|prognos/i;
const PROHIBITED_PROPERTY =
  /^(diagnosis|disease|treatment|prescription|dosage|prognosis|prediction)$/i;

function collectPropertyNames(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectPropertyNames);
  }

  if (typeof value !== 'object' || value === null) {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) => [
    key,
    ...collectPropertyNames(child),
  ]);
}

it('keeps all successful YunQi responses inside the medical-safety boundary', async () => {
  const app = await buildApp({
    provider: fixedCalendarProvider,
    now: () => 1_716_210_000_000,
    logger: false,
  });

  try {
    const responses = await Promise.all([
      app.inject({
        method: 'GET',
        url: '/api/v1/yunqi/year/2024',
      }),
      app.inject({
        method: 'GET',
        url: '/api/v1/yunqi/current',
      }),
      app.inject({
        method: 'POST',
        url: '/api/v1/yunqi/calculate',
        payload: { dateTime: '2024-05-20T21:00:00' },
      }),
    ]);

    for (const response of responses) {
      expect(response.statusCode).toBe(200);
      const body: unknown = response.json();
      expect(JSON.stringify(body)).not.toMatch(PROHIBITED);
      expect(collectPropertyNames(body)).not.toEqual(
        expect.arrayContaining([expect.stringMatching(PROHIBITED_PROPERTY)]),
      );
    }
  } finally {
    await app.close();
  }
});
