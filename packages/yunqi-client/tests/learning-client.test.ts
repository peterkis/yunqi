import { describe, expect, it, vi } from 'vitest';
import { createFetchTransport, createYunQiClient } from '../src/index.js';

describe('learning and questionnaire transport boundary', () => {
  it('keeps personal input in JSON POST bodies and unwraps all five new operations', async () => {
    const payload = { code: 'SUCCESS', message: '', data: { marker: 'server-owned-result' } };
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => Response.json(payload));
    const client = createYunQiClient(createFetchTransport({ baseUrl: 'https://example.test/', fetchImpl }));
    const birth = { birthDate: '1990-05-12', birthTime: '09:30:00' };
    const assessment = { questionnaireId: 'GBT46939-2025' as const, sex: 'female' as const, answers: { fatigue: 3 } };
    const responses = await Promise.all([
      client.getLearningCurrent(), client.calculateLearning({ dateTime: '2026-11-16T08:00:00' }),
      client.compareBirth(birth), client.getConstitutionQuestionnaire(), client.assessConstitution(assessment),
    ]);
    expect(responses).toEqual(Array(5).fill(payload.data));
    expect(fetchImpl.mock.calls.map(([url, init]) => ({ url, method: init?.method, body: init?.body }))).toEqual([
      { url: 'https://example.test/api/v1/yunqi/learning/current', method: 'GET', body: undefined },
      { url: 'https://example.test/api/v1/yunqi/learning/calculate', method: 'POST', body: JSON.stringify({ dateTime: '2026-11-16T08:00:00' }) },
      { url: 'https://example.test/api/v1/yunqi/learning/birth-comparison', method: 'POST', body: JSON.stringify(birth) },
      { url: 'https://example.test/api/v1/constitution/questionnaire', method: 'GET', body: undefined },
      { url: 'https://example.test/api/v1/constitution/assess', method: 'POST', body: JSON.stringify(assessment) },
    ]);
  });

  it('preserves errors from the scoring endpoint', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      code: 'INVALID_ARGUMENT', message: '量表提交无效', details: {},
    }, { status: 400 }));
    const client = createYunQiClient(createFetchTransport({ baseUrl: '', fetchImpl }));
    await expect(client.assessConstitution({ questionnaireId: 'GBT46939-2025', sex: 'male', answers: {} }))
      .rejects.toMatchObject({ name: 'YunQiApiError', status: 400, message: '量表提交无效' });
  });
});
