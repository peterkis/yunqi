// All answers and dates in this corpus are synthetic. No patient records are read.
export const FIXED_NOW = 1_794_801_600_000;
const base = '/api/v1/yunqi';
const learning = base + '/learning';
const constitution = '/api/v1/constitution';

export async function runCases(check, formatLocal, { exhaustive = false } = {}) {
  const get = (label, path, golden = false) => check(label, { method: 'GET', path }, golden);
  const post = (label, path, body, golden = false, nowMs) => check(label, { method: 'POST', path, body, nowMs }, golden);
  await get('health', '/health', true);
  await get('current', base + '/current', true);
  await get('learning-current', learning + '/current', true);

  // Full annual payloads include every one of the six term instants and boundaries.
  // Check both sides of each boundary for representative years across the interval.
  const detailedYears = new Set([1900, 1919, 1949, 1984, 1988, 2000, 2024, 2026, 2033, 2099, 2100]);
  for (let year = 1900; year <= 2100; year++) {
    const annual = await get('annual/' + year, base + '/year/' + year, detailedYears.has(year));
    if (!annual?.data?.sixQi?.steps) throw new Error('annual oracle failed for ' + year);
    const midYear = year + '-08-15T12:34:56.123+08:00';
    const lesson = await post('learning-sample/' + year, learning + '/calculate', { dateTime: midYear }, year === 2026);
    if (!exhaustive && !detailedYears.has(year)) continue;
    const edges = new Map();
    for (const step of annual.data.sixQi.steps) edges.set(step.start.epochMilliseconds, 'qi' + step.index);
    for (const step of lesson.data.movements) {
      if (!edges.has(step.start.epochMilliseconds)) edges.set(step.start.epochMilliseconds, 'movement' + step.index);
    }
    edges.set(annual.data.interval.end.epochMilliseconds, 'end');
    for (const [edge, name] of edges) {
      for (const delta of [-1, 0, 1]) {
        const body = { dateTime: formatLocal(edge + delta) };
        const id = year + '/' + name + '/' + delta;
        await post('boundary-core/' + id, base + '/calculate', body);
        await post('boundary-learning/' + id, learning + '/calculate', body);
      }
    }
  }
  for (const bad of ['1899', '2101', 'abc', '2020.5']) await get('year-invalid/' + bad, base + '/year/' + bad);
  const forms = [
    '1988-07-01T04:00:00Z', '1988-07-01T12:00:00+08:00', '1988-07-01T12:00:00',
    '2000-02-29T23:59:59.999', '1900-02-29T00:00:00', '2100-02-29T00:00:00',
    '2026-01-01T00:00:00+09:00', '2026-11-18T08:44:00', '2102-01-01T00:00:00',
  ];
  for (const [index, dateTime] of forms.entries()) {
    await post('forms-core/' + index, base + '/calculate', { dateTime }, true);
    await post('forms-learning/' + index, learning + '/calculate', { dateTime });
  }
  for (const [index, bad] of [{}, { dateTime: ['2026-01-01T12:00:00'] },
    { dateTime: true }, { dateTime: '2026-11-16T12:00:00', extra: 1 }].entries()) {
    await post('invalid-calculate/' + index, base + '/calculate', bad);
  }

  const boundaryYear = (await get('birth/baseline', base + '/year/2026')).data;
  const boundary = boundaryYear.sixQi.steps[2].start;
  const date = boundary.localTime.slice(0, 10);
  const time = boundary.localTime.slice(11, 19);
  for (const delta of [-1, 0, 1]) {
    for (const [i, body] of [{ birthDate: date }, { birthDate: date, birthTime: time }].entries()) {
      await post('birth/split/' + i + '/' + delta, learning + '/birth-comparison', body, true,
        boundary.epochMilliseconds + delta);
    }
  }
  for (const [i, body] of [
    { birthDate: '1900-01-01' }, { birthDate: '1900-01-20' }, { birthDate: '1990-08-15' },
    { birthDate: '2000-02-29', birthTime: '23:59:59' }, { birthDate: '2026-11-16' },
    { birthDate: '2026-11-17' }, { birthDate: '1990-02-29' }, { birthDate: '1990-08-15', birthTime: '24:00:00' },
    { birthDate: '1990-08-15', extra: true },
  ].entries()) await post('birth/day/' + i, learning + '/birth-comparison', body, i === 3);

  for (const year of [1899, 1900, 1988, 2026, 2027, 2100]) {
    await post('birth/year/' + year, learning + '/birth-year-comparison', { year }, true);
  }
  for (const [i, body] of [
    { year: 2023, calendar: 'lunar', month: 2, day: 1 }, // ordinary month and leap month
    { year: 2023, calendar: 'lunar', month: 2, day: 1, leap: true },
    { year: 2023, calendar: 'lunar', month: 2, day: 1, leap: false },
    { year: 2024, calendar: 'lunar', month: 2, day: 1, leap: true },
    { year: 2024, calendar: 'lunar', month: 12, day: 30 },
    { year: 1900, calendar: 'lunar', month: 1, day: 1 },
    { year: 2024, calendar: 'solar', month: 2, day: 29 },
    { year: 2023, calendar: 'solar', month: 2, day: 29 },
    { year: 2024, calendar: 'solar', month: 2, day: 29, leap: false },
    { year: 1900, calendar: 'solar', month: 1, day: 1 },
    { year: 2026, calendar: 'solar', month: 11, day: 17 },
    { year: 2027, calendar: 'solar', month: 1, day: 1 },
    { year: 2024, calendar: 'lunar', month: 13, day: 1 },
  ].entries()) await post('birth/preview/' + i, learning + '/birth-date-preview', body, true);

  // Exercise existing AJV scalar coercion and closed-object constraints independently
  // of the calculation cases. Desktop IPC serializes JSON with the same contract.
  const preview = { year: 2023, calendar: 'lunar', month: 2, day: 1 };
  for (const [i, overrides] of [
    { year: '2023', month: '02', day: '1', leap: 'false' },
    { calendar: 'lunar', leap: 1 }, { calendar: 'lunar', leap: null },
    { calendar: [] }, { calendar: {} }, { calendar: 1 }, { calendar: null },
    { month: 0 }, { day: 32 }, { day: 2.5 }, { leap: 'yes' }, { leap: [] },
    { year: [2023] }, { day: true }, { year: '' }, { unexpected: true },
  ].entries()) await post('preview-contract/' + i, learning + '/birth-date-preview', { ...preview, ...overrides });
  for (const [i, body] of [
    { birthDate: '2026-11-16', birthTime: '12:00:00' },
    { birthDate: '2026-11-16', birthTime: '12:00:01' },
    { birthDate: ['2026-11-16'] }, { birthDate: true }, { birthDate: null },
    { birthDate: '2024-01-01', birthTime: ['08:00:00'] },
    { birthDate: '2024-01-01', birthTime: '' },
  ].entries()) await post('birth-contract/' + i, learning + '/birth-comparison', body);
  for (const [i, year] of ['2023', [2023], null, 2024.5, ''].entries()) {
    await post('birth-year-contract/' + i, learning + '/birth-year-comparison', { year });
  }

  const form = (await get('questionnaire', constitution + '/questionnaire', true)).data;
  const assess = (label, body, golden = false) => post('assessment/' + label, constitution + '/assess', body, golden);
  for (const sex of ['male', 'female']) {
    const answers = Object.fromEntries(form.questions.filter(q => q.sex === 'all' || q.sex === sex).map(q => [q.id, 1]));
    answers.energy = 5;
    const baseBody = { questionnaireId: form.id, sex, answers };
    await assess('balanced/' + sex, baseBody, true);
    const profiles = [
      { fatigue: 5 }, { fatigue: 5, short_breath: 2 }, { energy: 1, fatigue: 2, low_mood: 2, cold_intolerance: 2 },
      { body_heat: 3, dry_skin_lips: 3, flushed_cheeks: 3, body_heaviness: 3, soft_abdomen: 3, sticky_mouth: 3 },
      { sneezing: 5, allergy: 2 }, { sneezing: 5, allergy: 3 }, { sneezing: 5, allergy: 4 },
    ];
    for (const [i, overrides] of profiles.entries()) {
      await assess('threshold/' + sex + '/' + i, { ...baseBody, answers: { ...answers, ...overrides } }, true);
    }
    let state = 1794801;
    for (let i = 0; i < 64; i++) {
      const mixed = {};
      for (const id of Object.keys(answers)) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        mixed[id] = 1 + state % 5;
      }
      await assess('mixed/' + sex + '/' + i, { ...baseBody, answers: mixed });
    }
    for (const key of Object.keys(answers)) {
      const partial = { ...answers };
      delete partial[key];
      await assess('missing/' + sex + '/' + key, { ...baseBody, answers: partial });
    }
    for (const [i, value] of [0, 6, 1.5, true, '1', [1], null].entries()) {
      await assess('invalid/' + sex + '/' + i, { ...baseBody, answers: { ...answers, fatigue: value } });
    }
    for (const [i, change] of [
      { questionnaireId: 'obsolete' }, { sex: 'other' }, { sex: [] }, { answers: {} },
      { answers: { ...answers, unknown: 1 } }, { answers: { ...answers, [sex === 'male' ? 'yellow_discharge' : 'damp_scrotum']: 1 } },
      { unexpected: true },
    ].entries()) await assess('malformed/' + sex + '/' + i, { ...baseBody, ...change });
  }
}
