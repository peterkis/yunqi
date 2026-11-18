import Ajv2020 from 'ajv/dist/2020.js';
import { tyme4tsCalendarProvider } from '@yunqi/calendar-adapter-tyme4ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import type { BirthComparisonDto, YunQiLearningDto } from '../src/schemas/learning.js';
import type { YunQiCalculationDto, YunQiYearDto } from '../src/schemas/yunqi.js';

// Hand-pinned input and oracle: 2026-11-18 08:44 Beijing, with the real adapter.
const INPUT = '2026-11-18T08:44:00+08:00';
const INPUT_EPOCH = 1_794_962_640_000;
const QI_PROGRESS = { elapsedRatio: 0.929, remainingCalendarDays: 4, endsOnInputDate: false };
const MOVEMENT_PROGRESS = { elapsedRatio: 0.095, remainingCalendarDays: 63, endsOnInputDate: false };
const MOVEMENT_RELATION = {
  elementRelation: 'DIFFERENT_ELEMENT', direction: 'GUEST_GENERATES_HOST', traditionalLabel: '相得 · 客生主',
};

describe('Contract 1.3.0 stage facts over HTTP', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let document: Record<string, any>;
  let ajv: Ajv2020;
  const rootId = 'https://yunqi.local/stage-facts-contract.json';
  const now = vi.fn(() => INPUT_EPOCH);

  beforeEach(async () => {
    now.mockClear();
    app = await buildApp({ provider: tyme4tsCalendarProvider, now, logger: false });
    await app.ready();
    document = app.swagger();
    ajv = new Ajv2020({ strict: false, allErrors: true });
    ajv.addSchema({ $id: rootId, components: document.components });
  });

  afterEach(async () => { await app.close(); });

  async function success<T>(url: string, payload?: object, schemaPath = url): Promise<T> {
    const method = payload === undefined ? 'GET' : 'POST';
    const response = await app.inject(payload === undefined ? { method, url } : { method, url, payload });
    expect(response.statusCode).toBe(200);
    const schema = document.paths[schemaPath][method.toLowerCase()].responses['200']
      .content['application/json'].schema;
    const validate = ajv.compile({ $ref: rootId + schema.$ref });
    const body = response.json<{ data: T }>();
    expect(validate(body), JSON.stringify(validate.errors)).toBe(true);
    return body.data;
  }

  function expectCalculation(data: YunQiCalculationDto) {
    expect(data.input.localTime).toBe(INPUT);
    expect(data.ruleVersion).toBe('YQ-MVP-RULES-1.1.0');
    expect(data.currentStep).toMatchObject({ name: '五之气', startTerm: '秋分', endTerm: '小雪' });
    expect(data.currentStepProgress).toEqual(QI_PROGRESS);
    expect(data.currentStep).toEqual(data.sixQi.steps[4]);
    expect(data.sixQi.steps.map((step) => [step.startTerm, step.endTerm])).toEqual([
      ['大寒', '春分'], ['春分', '小满'], ['小满', '大暑'],
      ['大暑', '秋分'], ['秋分', '小雪'], ['小雪', '大寒'],
    ]);
    for (const step of data.sixQi.steps) expect(step).not.toHaveProperty('currentStepProgress');
  }

  function expectLearning(data: YunQiLearningDto) {
    expectCalculation(data.facts);
    expect(data.ruleVersion).toBe('YQ-LEARNING-RULES-1.2.0');
    expect(data.currentMovement).toMatchObject({
      name: '终运', startLabel: '立冬后4日', endLabel: '大寒',
      host: { element: '水', state: '太过', tone: '太羽' },
      guest: { element: '金', state: '不及', tone: '少商' },
      relation: MOVEMENT_RELATION,
    });
    expect(data.currentMovementProgress).toEqual(MOVEMENT_PROGRESS);
    expect(data.currentMovement).toEqual(data.movements[4]);
    expect(data.movements.map((step) => [step.startLabel, step.endLabel])).toEqual([
      ['大寒', '春分后13日'], ['春分后13日', '芒种后10日'], ['芒种后10日', '处暑后7日'],
      ['处暑后7日', '立冬后4日'], ['立冬后4日', '大寒'],
    ]);
    for (const step of data.movements) {
      expect(step.relation).toEqual(MOVEMENT_RELATION);
      expect(step.relation).not.toHaveProperty('qiRelation');
      expect(step).not.toHaveProperty('currentMovementProgress');
    }
  }

  it('adds all six boundary pairs to annual output without input-relative progress', async () => {
    const data = await success<YunQiYearDto>('/api/v1/yunqi/year/2026', undefined, '/api/v1/yunqi/year/{year}');
    expect(data.sixQi.steps[4]).toMatchObject({ startTerm: '秋分', endTerm: '小雪' });
    expect(data.sixQi.steps[5]).toMatchObject({ startTerm: '小雪', endTerm: '大寒' });
    expect(data).not.toHaveProperty('currentStepProgress');
    expect(data).not.toHaveProperty('currentMovementProgress');
    expect(now).not.toHaveBeenCalled();
  });

  it('returns the golden current facts using one injected clock read', async () => {
    expectCalculation(await success<YunQiCalculationDto>('/api/v1/yunqi/current'));
    expect(now).toHaveBeenCalledTimes(1);
  });

  it.each([INPUT, '2026-11-18T08:44:00', '2026-11-18T00:44:00Z'])(
    'keeps submitted calculation progress relative to normalized input %s', async (dateTime) => {
      expectCalculation(await success<YunQiCalculationDto>('/api/v1/yunqi/calculate', { dateTime }));
      expect(now).not.toHaveBeenCalled();
    },
  );

  it('returns the golden current learning facts and expert-confirmed movement relation', async () => {
    expectLearning(await success<YunQiLearningDto>('/api/v1/yunqi/learning/current'));
    expect(now).toHaveBeenCalledTimes(1);
  });

  it('returns the same new fields for submitted learning without reading the clock', async () => {
    expectLearning(await success<YunQiLearningDto>('/api/v1/yunqi/learning/calculate', { dateTime: INPUT }));
    expect(now).not.toHaveBeenCalled();
  });

  it.each([
    [2022, 'NONE', '主客同运'],
    [2023, 'HOST_GENERATES_GUEST', '相得 · 主生客'],
    [2024, 'HOST_CONTROLS_GUEST', '逆 · 主胜客'],
    [2025, 'GUEST_CONTROLS_HOST', '顺 · 客胜主'],
    [2026, 'GUEST_GENERATES_HOST', '相得 · 客生主'],
  ] as const)('carries teaching-rule 1.2.0 labels through the unchanged schema for %i', async (year, direction, traditionalLabel) => {
    const data = await success<YunQiLearningDto>('/api/v1/yunqi/learning/calculate', {
      dateTime: `${year}-11-18T08:44:00+08:00`,
    });
    expect(data.ruleVersion).toBe('YQ-LEARNING-RULES-1.2.0');
    expect(data.facts.ruleVersion).toBe('YQ-MVP-RULES-1.1.0');
    expect(data.currentMovement.relation).toEqual({
      elementRelation: direction === 'NONE' ? 'SAME_ELEMENT' : 'DIFFERENT_ELEMENT',
      direction, traditionalLabel,
    });
    expect(data.movements).toHaveLength(5);
    for (const movement of data.movements) expect(movement.relation).toEqual(data.currentMovement.relation);
    expect(now).not.toHaveBeenCalled();
  });

  it.each([{ birthTime: '08:44:00' }, {}])('carries candidate-relative progress through birth comparison (%j)', async (precision) => {
    const data = await success<BirthComparisonDto>('/api/v1/yunqi/learning/birth-comparison', {
      birthDate: '2026-11-18', ...precision,
    });
    expect(data.ruleVersion).toBe('YQ-LEARNING-RULES-1.2.0');
    expectLearning(data.current);
    expect(now).toHaveBeenCalledTimes(1);
    expect(data.candidates).toHaveLength(1);
    for (const candidate of data.candidates) {
      expect(candidate.learning.facts.input).toEqual(candidate.from);
      const input = candidate.from.localTime;
      const expected = await success<YunQiLearningDto>('/api/v1/yunqi/learning/calculate', { dateTime: input });
      expect(candidate.learning).toEqual(expected);
      if ('birthTime' in precision) {
        expectLearning(candidate.learning);
      } else {
        expect(input).toBe('2026-11-18T00:00:00+08:00');
        expect(candidate.learning.facts.currentStepProgress).toEqual({
          elapsedRatio: 0.923, remainingCalendarDays: 4, endsOnInputDate: false,
        });
        expect(candidate.learning.facts.currentStepProgress).not.toEqual(data.current.facts.currentStepProgress);
      }
    }
  });

  it('validates unchanged constitution endpoints in the same eight-operation contract', async () => {
    const questionnaire = await success<{ id: string; questions: { id: string; sex: string }[] }>(
      '/api/v1/constitution/questionnaire',
    );
    const answers = Object.fromEntries(questionnaire.questions
      .filter((question) => question.sex === 'all' || question.sex === 'female')
      .map((question) => [question.id, 1]));
    await success('/api/v1/constitution/assess', { questionnaireId: questionnaire.id, sex: 'female', answers });
  });

  it('rejects missing stage fields, movement-only boundary terms and additional relation/progress fields', async () => {
    const original = await success<YunQiLearningDto>('/api/v1/yunqi/learning/current');
    const validate = ajv.compile({ $ref: `${rootId}#/components/schemas/YunQiLearningDto` });
    expect(validate(original)).toBe(true);
    const mutations: [string, (data: Record<string, any>) => void][] = [
      ['current qi start term required', (data) => { delete data.facts.currentStep.startTerm; }],
      ['all qi end terms required', (data) => { delete data.facts.sixQi.steps[5].endTerm; }],
      ...['芒种', '处暑', '立冬'].map((term): [string, (data: Record<string, any>) => void] =>
        [term, (data) => { data.facts.currentStep.startTerm = term; }]),
      ['qi progress required', (data) => { delete data.facts.currentStepProgress; }],
      ['movement progress required', (data) => { delete data.currentMovementProgress; }],
      ['movement relation required', (data) => { delete data.movements[0].relation; }],
      ['start label required', (data) => { delete data.currentMovement.startLabel; }],
      ['end label required', (data) => { delete data.movements[4].endLabel; }],
      ['no qi identity on movement', (data) => { data.currentMovement.relation.qiRelation = 'DIFFERENT_QI'; }],
      ['closed movement relation', (data) => { data.movements[0].relation.extra = true; }],
      ['closed qi step', (data) => { data.facts.currentStep.extra = true; }],
      ['closed movement step', (data) => { data.currentMovement.extra = true; }],
      ['closed progress', (data) => { data.facts.currentStepProgress.extra = true; }],
      ['closed calculation', (data) => { data.facts.extra = true; }],
      ['closed learning', (data) => { data.extra = true; }],
      ['valid relation direction', (data) => { data.currentMovement.relation.direction = 'UNKNOWN'; }],
      ['valid element relation', (data) => { data.currentMovement.relation.elementRelation = 'UNKNOWN'; }],
    ];
    for (const [name, mutate] of mutations) {
      const changed = structuredClone(original);
      mutate(changed);
      expect(validate(changed), name).toBe(false);
    }
  });

  it('enforces progress numeric bounds, integer days, boolean date flag and all three required fields', () => {
    const validate = ajv.compile({ $ref: `${rootId}#/components/schemas/StageProgressDto` });
    for (const value of [QI_PROGRESS, MOVEMENT_PROGRESS,
      { elapsedRatio: 0, remainingCalendarDays: 0, endsOnInputDate: true },
      { elapsedRatio: 0.999, remainingCalendarDays: 1, endsOnInputDate: false }]) {
      expect(validate(value), JSON.stringify(validate.errors)).toBe(true);
    }
    for (const value of [
      { ...QI_PROGRESS, elapsedRatio: -0.001 }, { ...QI_PROGRESS, elapsedRatio: 1 },
      { ...QI_PROGRESS, elapsedRatio: '0.5' }, { ...QI_PROGRESS, remainingCalendarDays: -1 },
      { ...QI_PROGRESS, remainingCalendarDays: 1.5 }, { ...QI_PROGRESS, endsOnInputDate: 'false' },
      { ...QI_PROGRESS, extra: true },
      { elapsedRatio: 0, remainingCalendarDays: 0 }, { elapsedRatio: 0, endsOnInputDate: true },
      { remainingCalendarDays: 0, endsOnInputDate: true },
    ]) expect(validate(value), JSON.stringify(value)).toBe(false);
  });
});
