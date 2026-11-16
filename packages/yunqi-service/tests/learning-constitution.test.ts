import type { Static } from '@fastify/type-provider-typebox';
import { tyme4tsCalendarProvider } from '@yunqi/calendar-adapter-tyme4ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import {
  formatYunQiCalendarTime,
  normalizeEpochMilliseconds,
} from '../src/modules/time-normalizer/index.js';
import type {
  ConstitutionAssessmentDtoSchema,
  ConstitutionQuestionnaireDtoSchema,
} from '../src/schemas/constitution.js';
import type { BirthComparisonDto, YunQiLearningDto } from '../src/schemas/learning.js';
import type { YunQiYearDto } from '../src/schemas/yunqi.js';

type Questionnaire = Static<typeof ConstitutionQuestionnaireDtoSchema>;
type Assessment = Static<typeof ConstitutionAssessmentDtoSchema>;

// Fixed epoch for 2026-11-16T12:00:00+08:00. This is an injected system
// clock; all calendar boundaries below come from the real Service/adapter.
const NOW_EPOCH = 1_794_801_600_000;
const CURRENT = '/api/v1/yunqi/learning/current';
const CALCULATE = '/api/v1/yunqi/learning/calculate';
const BIRTH = '/api/v1/yunqi/learning/birth-comparison';
const QUESTIONNAIRE = '/api/v1/constitution/questionnaire';
const ASSESS = '/api/v1/constitution/assess';

function canonicalAt(epoch: number): string {
  return formatYunQiCalendarTime(normalizeEpochMilliseconds(epoch)).localTime;
}

function itemAt<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`Expected item at index ${index}`);
  return item;
}

function assertInvalid(response: {
  statusCode: number;
  headers: Record<string, unknown>;
  body: string;
}) {
  expect(response.statusCode).toBe(400);
  expect(response.headers['cache-control']).toBe('no-store');
  const error = JSON.parse(response.body) as Record<string, unknown>;
  expect(error.code).toBe('INVALID_ARGUMENT');
  expect(Object.keys(error).sort()).toEqual(['code', 'details', 'message']);
  expect(response.body).not.toMatch(/stack|RangeError|TypeError|at calculate|node_modules|secret-patient-sentinel/);
}

function responseContainsKey(value: unknown, forbidden: ReadonlySet<string>): boolean {
  if (value === null || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, nested]) =>
    forbidden.has(key) || responseContainsKey(nested, forbidden));
}

describe('learning, birth comparison and constitution API with the real calendar adapter', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let currentEpoch: number;
  const now = vi.fn(() => currentEpoch);

  beforeEach(async () => {
    currentEpoch = NOW_EPOCH;
    now.mockClear();
    app = await buildApp({ provider: tyme4tsCalendarProvider, now, logger: false });
  });

  afterEach(async () => {
    await app.close();
  });

  async function annual(year: number): Promise<YunQiYearDto> {
    const response = await app.inject({ method: 'GET', url: `/api/v1/yunqi/year/${year}` });
    expect(response.statusCode).toBe(200);
    return response.json<{ data: YunQiYearDto }>().data;
  }

  async function learning(dateTime: string): Promise<YunQiLearningDto> {
    const response = await app.inject({ method: 'POST', url: CALCULATE, payload: { dateTime } });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    return response.json<{ data: YunQiLearningDto }>().data;
  }

  async function birth(payload: { birthDate: string; birthTime?: string }): Promise<BirthComparisonDto> {
    const response = await app.inject({ method: 'POST', url: BIRTH, payload });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    return response.json<{ data: BirthComparisonDto }>().data;
  }

  async function questionnaire(): Promise<Questionnaire> {
    const response = await app.inject({ method: 'GET', url: QUESTIONNAIRE });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    return response.json<{ data: Questionnaire }>().data;
  }

  async function completedQuestionnaire(sex: 'male' | 'female' = 'female') {
    const definition = await questionnaire();
    const answers: Record<string, number> = Object.fromEntries(definition.questions
      .filter((question) => question.sex === 'all' || question.sex === sex)
      .map((question) => [question.id, 1]));
    answers.energy = 5;
    return { questionnaireId: definition.id, sex, answers };
  }

  it('keeps 2026 annual 不和 separate from the current fifth-qi 顺 relation', async () => {
    const response = await app.inject({ method: 'GET', url: CURRENT });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(now).toHaveBeenCalledTimes(1);
    const data = response.json<{ data: YunQiLearningDto }>().data;
    expect(data.facts).toMatchObject({
      year: 2026,
      stemBranch: { ganzhi: '丙午' },
      suiYun: { element: '水', state: '太过' },
      input: { localTime: '2026-11-16T12:00:00+08:00' },
      sixQi: { sitian: '少阴君火', zaiquan: '阳明燥金' },
      currentStep: { index: 5, name: '五之气', hostQi: '阳明燥金', guestQi: '少阳相火' },
    });
    expect(data.annualRelation).toMatchObject({ label: '不和', relation: '中运水克司天火' });
    expect(data.currentQi).toMatchObject({ label: '顺 · 客胜主', relation: '客火克主金' });
    expect(data.currentMovement.index).toBe(5);
    expect(data.movements).toHaveLength(5);
    expect(data.currentMovement.start.localTime.endsWith('+08:00')).toBe(true);
    expect(await learning('2026-11-16T12:00:00+08:00')).toEqual(data);
  });

  it('selects the classical text by annual movement and sitian plus phase, not phase alone', async () => {
    const year2026 = await learning('2026-11-16T12:00:00');
    const year2024 = await learning('2024-11-16T12:00:00');
    expect(year2026.annualPassages.map((passage) => passage.id)).toEqual([
      'suwen-69-水-太过', 'suwen-71-少阴君火-annual',
    ]);
    expect(year2026.currentPassages).toHaveLength(1);
    const current2026 = itemAt(year2026.currentPassages, 0);
    const current2024 = itemAt(year2024.currentPassages, 0);
    expect(current2026).toMatchObject({
      id: 'suwen-71-少阴君火-5', scope: 'qi-period',
      section: '少阴之政·子午之纪·五之气',
    });
    expect(current2026.quote).toContain('畏火临，暑反至');
    expect(current2024).toMatchObject({ id: 'suwen-71-太阳寒水-5' });
    expect(current2024.quote).toContain('阳复化');
    expect(current2024.quote).not.toBe(current2026.quote);
    for (const passage of [...year2026.annualPassages, ...year2026.currentPassages]) {
      expect(passage.work).toBeTruthy();
      expect(passage.chapter).toBeTruthy();
      expect(passage.explanation).toBeTruthy();
      expect(passage.sourceUrl).toMatch(/^https:\/\//);
    }
  });

  it.each([
    '2026-11-16T12:00:00',
    '2026-11-16T12:00:00+08:00',
    '2026-11-16T04:00:00Z',
  ])('normalizes equivalent learning time %s', async (dateTime) => {
    const data = await learning(dateTime);
    expect(data.facts.input).toMatchObject({
      localTime: '2026-11-16T12:00:00+08:00', epochMilliseconds: NOW_EPOCH,
      offset: '+08:00', calendarTimeStandard: 'BeijingStandardTime+08:00',
    });
  });

  it('keeps exact left-closed year and sixth-qi boundaries at millisecond precision', async () => {
    const year = await annual(2024);
    const first = year.interval.start.epochMilliseconds;
    const last = itemAt(year.sixQi.steps, 5).start.epochMilliseconds;
    for (const sample of [
      { epoch: first - 1, year: 2023, step: 6 },
      { epoch: first, year: 2024, step: 1 },
      { epoch: first + 1, year: 2024, step: 1 },
      { epoch: last - 1, year: 2024, step: 5 },
      { epoch: last, year: 2024, step: 6 },
      { epoch: last + 1, year: 2024, step: 6 },
    ]) {
      const data = await learning(canonicalAt(sample.epoch));
      expect(data.facts.year).toBe(sample.year);
      expect(data.facts.currentStep.index).toBe(sample.step);
      expect(data.facts.input.epochMilliseconds).toBe(sample.epoch);
    }
  });

  it('rejects out-of-range learning times while accepting both public interval edges', async () => {
    const first = (await annual(1900)).interval.start.epochMilliseconds;
    const end = (await annual(2100)).interval.end.epochMilliseconds;
    for (const epoch of [first - 1, end]) {
      assertInvalid(await app.inject({ method: 'POST', url: CALCULATE, payload: { dateTime: canonicalAt(epoch) } }));
    }
    expect((await learning(canonicalAt(first))).facts.year).toBe(1900);
    expect((await learning(canonicalAt(end - 1))).facts.year).toBe(2100);
  });

  it.each([
    {},
    { dateTime: ['2026-11-16T12:00:00'] },
    { dateTime: 20261116 },
    { dateTime: true },
    { dateTime: null },
    { dateTime: { value: '2026-11-16T12:00:00' } },
    { dateTime: '2026-02-30T12:00:00' },
    { dateTime: '2026-11-16T12:00:00.1' },
    { dateTime: '2026-11-16T12:00:00+09:00' },
    { dateTime: '2026-11-16T12:00:00', patientId: 'secret-patient-sentinel' },
  ])('rejects malformed learning input without echoing it (%j)', async (payload) => {
    assertInvalid(await app.inject({ method: 'POST', url: CALCULATE, payload }));
  });

  it('compares an explicitly known birth time with current facts and five named dimensions', async () => {
    const result = await birth({ birthDate: '1991-04-14', birthTime: '02:30:00' });
    expect(result).toMatchObject({ birthPrecision: 'time', ambiguous: false });
    expect(result.candidates).toHaveLength(1);
    const candidate = itemAt(result.candidates, 0);
    expect(candidate.from.localTime).toBe('1991-04-14T02:30:00+08:00');
    expect(candidate.until).toEqual(candidate.from);
    expect(candidate.learning.facts.input).toEqual(candidate.from);
    expect(candidate.comparisons.map((comparison) => comparison.title)).toEqual([
      '中运对照', '司天对照', '在泉对照', '客运对照', '客气对照',
    ]);
    expect(result.current.facts.input.localTime).toBe('2026-11-16T12:00:00+08:00');
    expect(result.message).toContain('不依据生日判定');
    expect(responseContainsKey(result, new Set(['patientId', 'patientName', 'birthDate', 'birthTime', 'answers', 'riskProbability', 'diagnosis']))).toBe(false);
  });

  it('retains an ordinary unknown-time birth as an interval without fabricating a known time', async () => {
    const result = await birth({ birthDate: '1990-08-15' });
    expect(result).toMatchObject({ birthPrecision: 'date', ambiguous: false });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      label: '当日已知时段归属一致',
      from: { localTime: '1990-08-15T00:00:00+08:00' },
      until: { localTime: '1990-08-16T00:00:00+08:00' },
    });
    expect(result.message).toContain('不是推定的出生时刻');
  });

  it('returns two date-only candidates when the real DaHan boundary falls within the birth date', async () => {
    const year = await annual(2024);
    const boundary = year.interval.start;
    const birthDate = boundary.localTime.slice(0, 10);
    const result = await birth({ birthDate });
    expect(result).toMatchObject({ birthPrecision: 'date', ambiguous: true });
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates.map((candidate) => candidate.learning.facts.year)).toEqual([2023, 2024]);
    expect(result.candidates.map((candidate) => candidate.learning.facts.currentStep.index)).toEqual([6, 1]);
    const first = itemAt(result.candidates, 0);
    const second = itemAt(result.candidates, 1);
    expect(first.from.localTime).toBe(`${birthDate}T00:00:00+08:00`);
    expect(first.until).toEqual(boundary);
    expect(second.from).toEqual(boundary);
    expect(result.message).toContain('不能任选一个作为确定结论');
    expect(result.message).toContain('左闭右开');
    const precise = await birth({ birthDate, birthTime: boundary.localTime.slice(11, 19) });
    expect(precise.ambiguous).toBe(false);
    expect(precise.candidates).toHaveLength(1);
    expect(itemAt(precise.candidates, 0).learning.facts.year).toBe(2024);
    expect(itemAt(precise.candidates, 0).learning.facts.currentStep.index).toBe(1);
  });

  it('returns two unknown-time candidates for a movement boundary even without a qi boundary', async () => {
    const yearly = await learning('2024-08-15T12:00:00');
    const boundary = itemAt(yearly.movements, 1).start;
    const result = await birth({ birthDate: boundary.localTime.slice(0, 10) });
    expect(result.ambiguous).toBe(true);
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates.map((candidate) => candidate.learning.currentMovement.index)).toEqual([1, 2]);
    const first = itemAt(result.candidates, 0);
    const second = itemAt(result.candidates, 1);
    expect(first.learning.facts.currentStep.index).toBe(second.learning.facts.currentStep.index);
    expect(first.until).toEqual(boundary);
    expect(second.from).toEqual(boundary);
  });

  it('limits an unknown birth date of today to the elapsed period', async () => {
    const result = await birth({ birthDate: '2026-11-16' });
    expect(result.ambiguous).toBe(false);
    expect(result.candidates).toHaveLength(1);
    expect(itemAt(result.candidates, 0).from.localTime).toBe('2026-11-16T00:00:00+08:00');
    expect(itemAt(result.candidates, 0).until.localTime).toBe('2026-11-16T12:00:00.001+08:00');
    expect(now).toHaveBeenCalledTimes(1);
  });

  it.each(
    (['year', 'qi', 'movement'] as const).flatMap((kind) =>
      [-1, 0, 1].map((delta) => ({ kind, delta })),
    ),
  )('includes the current millisecond for date-only today at $kind boundary $delta ms', async ({ kind, delta }) => {
    const year = await annual(2024);
    const boundary = kind === 'year'
      ? year.interval.start
      : kind === 'qi'
        ? itemAt(year.sixQi.steps, 1).start
        : itemAt((await learning('2024-08-15T12:00:00')).movements, 1).start;
    currentEpoch = boundary.epochMilliseconds + delta;
    const birthDate = boundary.localTime.slice(0, 10);
    const result = await birth({ birthDate });

    expect(result.birthPrecision).toBe('date');
    expect(result.ambiguous).toBe(delta >= 0);
    expect(result.candidates).toHaveLength(delta < 0 ? 1 : 2);
    expect(result.current.facts.input.epochMilliseconds).toBe(currentEpoch);
    expect(itemAt(result.candidates, 0).from.localTime).toBe(`${birthDate}T00:00:00+08:00`);
    const last = itemAt(result.candidates, result.candidates.length - 1);
    expect(last.until.epochMilliseconds).toBe(currentEpoch + 1);

    const coveringNow = result.candidates.filter((candidate) =>
      candidate.from.epochMilliseconds <= currentEpoch
      && currentEpoch < candidate.until.epochMilliseconds,
    );
    expect(coveringNow).toHaveLength(1);
    expect(itemAt(coveringNow, 0).learning.facts.year).toBe(result.current.facts.year);
    expect(itemAt(coveringNow, 0).learning.facts.currentStep).toEqual(result.current.facts.currentStep);
    expect(itemAt(coveringNow, 0).learning.currentMovement).toEqual(result.current.currentMovement);

    for (let index = 0; index < result.candidates.length; index += 1) {
      const candidate = itemAt(result.candidates, index);
      expect(candidate.from.epochMilliseconds).toBeLessThan(candidate.until.epochMilliseconds);
      expect(candidate.learning.facts.input.epochMilliseconds).toBeLessThanOrEqual(currentEpoch);
      expect(candidate.until.epochMilliseconds).toBeLessThanOrEqual(currentEpoch + 1);
      if (index > 0) {
        expect(itemAt(result.candidates, index - 1).until).toEqual(candidate.from);
      }
    }
    if (delta >= 0) {
      expect(last.from).toEqual(boundary);
      expect(itemAt(result.candidates, 0).until).toEqual(boundary);
    }

    // BirthRequest accepts whole seconds. Verify the latest representable
    // precise time against the unique date-only interval that contains it.
    const precise = await birth({ birthDate, birthTime: canonicalAt(currentEpoch).slice(11, 19) });
    const exact = itemAt(precise.candidates, 0);
    const matching = result.candidates.filter((candidate) =>
      candidate.from.epochMilliseconds <= exact.from.epochMilliseconds
      && exact.from.epochMilliseconds < candidate.until.epochMilliseconds,
    );
    expect(matching).toHaveLength(1);
    expect(exact.until).toEqual(exact.from);
    const matched = itemAt(matching, 0);
    expect(matched.learning.facts.year).toBe(exact.learning.facts.year);
    expect(matched.learning.facts.currentStep).toEqual(exact.learning.facts.currentStep);
    expect(matched.learning.currentMovement).toEqual(exact.learning.currentMovement);
    expect(matched.comparisons).toEqual(exact.comparisons);
  });

  it('returns a nonempty one-millisecond date-only interval at midnight', async () => {
    currentEpoch = (await learning('2026-11-16T00:00:00')).facts.input.epochMilliseconds;
    const result = await birth({ birthDate: '2026-11-16' });
    expect(result.ambiguous).toBe(false);
    expect(result.candidates).toHaveLength(1);
    const candidate = itemAt(result.candidates, 0);
    expect(candidate.from.localTime).toBe('2026-11-16T00:00:00+08:00');
    expect(candidate.until.localTime).toBe('2026-11-16T00:00:00.001+08:00');
    expect(candidate.until.epochMilliseconds - candidate.from.epochMilliseconds).toBe(1);
    const exact = itemAt((await birth({ birthDate: '2026-11-16', birthTime: '00:00:00' })).candidates, 0);
    expect(candidate.learning).toEqual(exact.learning);
    expect(candidate.comparisons).toEqual(exact.comparisons);
  });

  it('caps the last current millisecond at the next midnight without spilling into another date', async () => {
    currentEpoch = (await learning('2026-11-16T23:59:59.999')).facts.input.epochMilliseconds;
    const result = await birth({ birthDate: '2026-11-16' });
    const last = itemAt(result.candidates, result.candidates.length - 1);
    expect(last.until.localTime).toBe('2026-11-17T00:00:00+08:00');
    expect(last.until.epochMilliseconds).toBe(currentEpoch + 1);
    expect(last.learning.facts.input.epochMilliseconds).toBeLessThanOrEqual(currentEpoch);
    assertInvalid(await app.inject({ method: 'POST', url: BIRTH, payload: { birthDate: '2026-11-17' } }));
  });

  it('includes the final supported millisecond without calculating at the excluded 2101 DaHan endpoint', async () => {
    const boundary = (await annual(2100)).interval.end;
    currentEpoch = boundary.epochMilliseconds - 1;
    const result = await birth({ birthDate: boundary.localTime.slice(0, 10) });
    expect(result.current.facts.year).toBe(2100);
    expect(result.ambiguous).toBe(false);
    expect(result.candidates).toHaveLength(1);
    const candidate = itemAt(result.candidates, 0);
    expect(candidate.learning.facts.year).toBe(2100);
    expect(candidate.until).toEqual(boundary);
    expect(candidate.from.epochMilliseconds).toBeLessThanOrEqual(currentEpoch);
    expect(currentEpoch).toBeLessThan(candidate.until.epochMilliseconds);
  });

  it('accepts today at the injected current instant but rejects a future time', async () => {
    expect((await birth({ birthDate: '2026-11-16', birthTime: '12:00:00' })).candidates).toHaveLength(1);
    assertInvalid(await app.inject({ method: 'POST', url: BIRTH, payload: { birthDate: '2026-11-16', birthTime: '12:00:01' } }));
    assertInvalid(await app.inject({ method: 'POST', url: BIRTH, payload: { birthDate: '2026-11-17' } }));
  });

  it.each([
    {},
    { birthDate: ['1990-08-15'] },
    { birthDate: 19900815 },
    { birthDate: true },
    { birthDate: null },
    { birthDate: '1990-02-29' },
    { birthDate: '2024-02-30' },
    { birthDate: '1990-08-15', birthTime: '' },
    { birthDate: '1990-08-15', birthTime: '24:00:00' },
    { birthDate: '1990-08-15', birthTime: ['12:00:00'] },
    { birthDate: '1990-08-15', birthTime: true },
    { birthDate: '1990-08-15', birthTime: '12:00:00Z' },
    { birthDate: '1899-08-15' },
    { birthDate: '1990-08-15', patientId: 'secret-patient-sentinel' },
  ])('rejects malformed or unsupported birth input (%j)', async (payload) => {
    assertInvalid(await app.inject({ method: 'POST', url: BIRTH, payload }));
  });

  it('exposes a versioned questionnaire and never pre-populates patient answers', async () => {
    const data = await questionnaire();
    expect(data).toMatchObject({ id: 'GBT46939-2025', version: 'YQ-CONSTITUTION-1.0.0', standard: 'GB/T 46939-2025' });
    expect(data.questions).toHaveLength(27);
    expect(data.scales).toHaveLength(9);
    expect(data.options.map((option) => option.value)).toEqual([1, 2, 3, 4, 5]);
    expect(data.instructions).toBeInstanceOf(Array);
    expect(data.sourceUrl).toContain('openstd.samr.gov.cn');
    expect(data.sourceNote).toContain('2025版国家标准第5章及附录A');
    expect(responseContainsKey(data, new Set(['answers', 'patientId', 'patientName', 'selectedValue']))).toBe(false);
  });

  it.each(['female', 'male'] as const)('scores the real questionnaire for %s with correct sex-specific denominator', async (sex) => {
    const input = await completedQuestionnaire(sex);
    expect(Object.keys(input.answers)).toHaveLength(26);
    const response = await app.inject({ method: 'POST', url: ASSESS, payload: input });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const result = response.json<{ data: Assessment }>().data;
    expect(result.results).toHaveLength(9);
    expect(result.results[0]).toMatchObject({ id: 'balanced', itemCount: 4, rawScore: 20, score: 100, status: 'yes' });
    expect(result.results.find((scale) => scale.id === 'damp_heat')).toMatchObject({ itemCount: 3, rawScore: 3, score: 0 });
    expect(result.matchedTypes).toEqual(['balanced']);
    expect(result.tendencyTypes).toEqual([]);
    expect(result.boundaryNote).toContain('不等同于诊断');
    expect(responseContainsKey(result, new Set(['answers', 'patientId', 'patientName', 'birthDate', 'birthTime']))).toBe(false);
  });

  it('returns both tied biased types with the balanced exclusion through the actual API', async () => {
    const input = await completedQuestionnaire();
    Object.assign(input.answers, { body_heat: 3, dry_skin_lips: 3, flushed_cheeks: 3,
      body_heaviness: 3, soft_abdomen: 3, sticky_mouth: 3 });
    const response = await app.inject({ method: 'POST', url: ASSESS, payload: input });
    expect(response.statusCode).toBe(200);
    const result = response.json<{ data: Assessment }>().data;
    expect(result.matchedTypes).toEqual(['yin_deficiency', 'phlegm_dampness']);
    expect(result.results.filter((scale) => scale.status === 'yes').map((scale) => scale.score)).toEqual([50, 50]);
    expect(result.results[0]).toMatchObject({ score: 100, status: 'no' });
    expect(result.summary).toContain('兼夹');
  });

  it('returns basically-balanced with a tendency while preserving the unrounded score', async () => {
    const input = await completedQuestionnaire();
    input.answers.fatigue = 5;
    const response = await app.inject({ method: 'POST', url: ASSESS, payload: input });
    expect(response.statusCode).toBe(200);
    const result = response.json<{ data: Assessment }>().data;
    expect(result.results[0]).toMatchObject({ score: 75, status: 'basically' });
    expect(result.results[1]).toMatchObject({ rawScore: 7, score: 100 / 3, status: 'tendency' });
    expect(result.tendencyTypes).toEqual(['qi_deficiency']);
  });

  it('rejects missing, unknown, or inapplicable questions rather than inventing values', async () => {
    const input = await completedQuestionnaire();
    const incomplete = { ...input.answers };
    delete incomplete.fatigue;
    for (const answers of [
      incomplete,
      { ...input.answers, arbitrary_question: 1 },
      { ...input.answers, damp_scrotum: 1 },
    ]) {
      assertInvalid(await app.inject({ method: 'POST', url: ASSESS, payload: { ...input, answers } }));
    }
  });

  it.each(['1', true, false, null, [1], { value: 1 }, 0, 6, 1.5])(
    'rejects answer %j without scalar coercion', async (invalid) => {
      const input = await completedQuestionnaire();
      const response = await app.inject({ method: 'POST', url: ASSESS,
        payload: { ...input, answers: { ...input.answers, fatigue: invalid } } });
      assertInvalid(response);
    },
  );

  it.each([undefined, null, [], [1], 'answers', 1, true])('rejects invalid answer collections (%j)', async (answers) => {
    const input = await completedQuestionnaire();
    assertInvalid(await app.inject({ method: 'POST', url: ASSESS, payload: { ...input, answers } }));
  });

  it.each([
    { questionnaireId: 'ZYYXH/T157-2009' },
    { questionnaireId: ['GBT46939-2025'] },
    { sex: 'unspecified' },
    { sex: ['female'] },
    { sex: true },
    { sex: null },
    { sex: undefined },
    { patientId: 'secret-patient-sentinel' },
  ])('rejects incorrect version, sex, or identity fields (%j)', async (changed) => {
    const input = await completedQuestionnaire();
    assertInvalid(await app.inject({ method: 'POST', url: ASSESS, payload: { ...input, ...changed } }));
  });
});
