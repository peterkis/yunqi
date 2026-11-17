import { describe, expect, it } from 'vitest';
import { createBirthComparisonDto } from '../../../../test/learning-fixtures';
import { mapBirthView } from './map-birth-view';

describe('birth presentation', () => {
  it('pairs all five named relations with the right facts even when the API order changes', () => {
    const dto = createBirthComparisonDto();
    const base = dto.candidates[0];
    const relation = base.comparisons[0];
    const comparisons = [
      { ...relation, title: '客运对照', label: '当前克出生', relation: '客运独有方向' },
      { ...relation, title: '中运对照', label: '出生生当前', relation: '出生金生当前水' },
      { ...relation, title: '客气对照', label: '同五行', relation: '客气独有方向' },
      { ...relation, title: '在泉对照', label: '出生克当前', relation: '在泉独有方向' },
      { ...relation, title: '司天对照', label: '当前生出生', relation: '司天独有方向' },
    ];
    const result = mapBirthView({ ...dto, candidates: [{ ...base, comparisons }] });
    const rows = result.candidates[0].rows;
    expect(rows.map((row) => [row.label, row.relation?.relation, row.relation?.tone])).toEqual([
      ['岁运', '出生金生当前水', 'favorable'],
      ['司天', '司天独有方向', 'favorable'],
      ['在泉', '在泉独有方向', 'adverse'],
      ['所处气', '客气独有方向', 'neutral'],
      ['所处运', '客运独有方向', 'adverse'],
    ]);
    expect(rows[0].birth.label).toBe(`${base.learning.facts.suiYun.element}运${base.learning.facts.suiYun.state}`);
    expect(rows[3].birth.detail).toContain(`客气 ${base.learning.facts.currentStep.guestQi}`);
    expect(rows[4].current.detail).toContain('客运 木运不及（少角）');
    expect(result.currentTime.localTime).toBe(dto.current.facts.input.localTime);
    expect(rows[0].relation?.sources).toEqual(relation.sources);
    expect(dto.candidates[0].comparisons).toHaveLength(1);
  });

  it.each([
    ['木', '厥阴风木', 'wood'], ['火', '少阴君火', 'fire'],
    ['土', '太阴湿土', 'earth'], ['金', '阳明燥金', 'metal'],
    ['水', '太阳寒水', 'water'], ['火', '少阳相火', 'fire'],
  ] as const)('renders %s / %s with its enum-backed dot identity', (element, qi, expected) => {
    const dto = createBirthComparisonDto();
    const candidate = dto.candidates[0];
    const learning = candidate.learning;
    const result = mapBirthView({ ...dto, candidates: [{ ...candidate, learning: { ...learning, facts: {
      ...learning.facts, suiYun: { ...learning.facts.suiYun, element },
      sixQi: { ...learning.facts.sixQi, sitian: qi, zaiquan: qi },
    } } }] });
    const rows = result.candidates[0].rows;
    expect(rows[0].birth.element).toBe(expected);
    expect(rows[1].birth.element).toBe(expected);
    expect(rows[2].birth.element).toBe(expected);
  });

  it('retains every interval and historical scope without showing a sampled instant as an unknown birth time', () => {
    const dto = createBirthComparisonDto();
    const first = dto.candidates[0];
    const boundary = { ...first.until, localTime: '1990-05-12T12:34:56.789+08:00' };
    const result = mapBirthView({ ...dto, ambiguous: true, candidates: [
      { ...first, until: boundary }, { ...first, label: '交界后', from: boundary },
    ] });
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0].until.localTime).toBe(boundary.localTime);
    expect(result.candidates[1].from.localTime).toBe(boundary.localTime);
    expect(result.candidates[1].periodReadings[0].scope).toBe('出生阶段');
    expect(result.currentReadings.at(-1)?.scope).toBe('当下阶段');
    expect(result.comparison.birthPrecision).toBe('date');
  });

  it('keeps unknown labels neutral and missing dimensions explicit rather than inventing relationships', () => {
    const dto = createBirthComparisonDto();
    const candidate = dto.candidates[0];
    const result = mapBirthView({ ...dto, candidates: [{ ...candidate, comparisons: [
      { ...candidate.comparisons[0], title: '司天对照', label: '新术语', relation: '服务端新说明' },
    ] }] });
    expect(result.candidates[0].rows[0].relation).toBeUndefined();
    expect(result.candidates[0].rows[1].relation).toMatchObject({ label: '新术语', relation: '服务端新说明', tone: 'neutral' });
  });

  it('separates excerpts from the unchanged full passage and removes only enclosing quote marks', () => {
    const dto = createBirthComparisonDto();
    const candidate = dto.candidates[0];
    const passage = candidate.learning.annualPassages[0];
    const quote = `原文中的“内引号”${'古籍原句。'.repeat(15)}`;
    const result = mapBirthView({ ...dto, candidates: [{ ...candidate, learning: { ...candidate.learning,
      annualPassages: [{ ...passage, scope: 'annual-movement', quote: `“${quote}”` }],
    } }] });
    const reading = result.candidates[0].annualReadings[0];
    expect(reading.quote).toBe(quote);
    expect(reading.fullQuote).toBe(quote);
    expect(reading.excerpt).toMatch(/^原文中的“内引号”.*……$/);
    expect(reading.scope).toBe('全年 · 岁运');
    expect(reading.source).toBe(`《${passage.work}·${passage.chapter}》${passage.section}`);
    expect(reading.sourceUrl).toBe(passage.sourceUrl);
    expect(result.candidates[0].periodReadings[0].fullQuote).toBeUndefined();
  });
});
