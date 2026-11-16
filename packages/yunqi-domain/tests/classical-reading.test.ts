import { describe, expect, it } from 'vitest';
import { createYunQiCalendarTime } from '../src/calendar/time.js';
import { calculateLearning } from '../src/learning/calculate-learning.js';
import { CLASSICAL_PASSAGES } from '../src/learning/passages.js';
import { CLASSICAL_READING_VERSION } from '../src/learning/sources.js';
import { ANNUAL_MOVEMENT_WITNESSES, ANNUAL_QI_WITNESSES } from './fixtures/classical-reading-witnesses.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

function passage(id: string) {
  const result = CLASSICAL_PASSAGES.find((entry) => entry.id === id);
  if (!result) throw new Error(`Missing passage ${id}`);
  return result;
}

describe('classical reading 1.1 text witnesses', () => {
  it('keeps every excerpt contiguous within its independently captured source context', () => {
    for (const entry of CLASSICAL_PASSAGES) {
      const match = entry.match;
      const witness = match.scope === 'annual-movement'
        ? ANNUAL_MOVEMENT_WITNESSES.find((source) => source.element === match.element && source.state === match.state)
        : ANNUAL_QI_WITNESSES.find((source) => source.sitian === match.sitian);
      expect(witness, entry.id).toBeDefined();
      expect(witness!.text, entry.id).toContain(entry.quote);
      // The source evidence retains the following context, but UI quotations stop before prescriptions.
      expect(entry.quote, entry.id).not.toMatch(/故岁宜|岁宜以|必折其郁气|必抑其运气|食岁谷|用寒远寒|渗之泄之/);
    }
  });

  // These anchors come from the first 民病 clause of each source paragraph, not production mappings.
  it.each([
    ['木', '太过', '民病飧泄食减，体重烦冤，肠鸣腹支满'],
    ['火', '太过', '民病疟，少气欬喘'],
    ['土', '太过', '民病腹痛，清厥意不乐'],
    ['金', '太过', '民病两恢下少腹痛'],
    ['水', '太过', '民病身热烦心躁悸'],
    ['木', '不及', '民病中清，胠恢痛少腹痛'],
    ['火', '不及', '民病胸中痛恢支满两恢痛'],
    ['土', '不及', '民病飧泄霍乱，体重腹痛'],
    ['金', '不及', '民病肩背瞀重，鼽嚏血便注下'],
    ['水', '不及', '民病腹满身重，濡泄寒疡流水'],
  ])('retains the annual illness passage for %s %s without inventing a diagnosis', (element, state, anchor) => {
    expect(passage(`suwen-69-${element}-${state}`).quote).toContain(anchor);
  });

  it.each([
    ['太阳寒水', 3, '民病寒，反热中，痈疽注下'],
    ['太阳寒水', 4, '民病大热，少气肌肉萎足痿'],
    ['阳明燥金', 1, '其病中热胀面目浮肿'],
    ['阳明燥金', 2, '物迺生荣，厉大至，'],
    ['少阳相火', 1, '寒来不杀，温病迺起'],
    ['少阳相火', 2, '民迺康。其病热郁于上'],
    ['少阳相火', 3, '民病热中，聋瞑血溢'],
    ['少阳相火', 6, '其病关闭不禁，心痛'],
    ['太阴湿土', 1, '民病血溢，筋络拘强'],
    ['太阴湿土', 3, '感于寒湿，则民病身重胕肿'],
    ['太阴湿土', 4, '民病腠理热，血暴溢疟'],
    ['太阴湿土', 6, '感于寒则病人关节禁固腰脽痛'],
    ['少阴君火', 1, '民反周密，关节禁固腰脽痛'],
    ['少阴君火', 2, '民迺和，其病淋'],
    ['少阴君火', 3, '民病气厥心痛，寒热更作'],
    ['少阴君火', 6, '病生皮腠，内舍于恢'],
  ])('preserves the omitted context for %s period %s', (sitian, step, anchor) => {
    expect(passage(`suwen-71-${sitian}-${step}`).quote).toContain(anchor);
  });

  it('does not add illness assertions to source periods that only describe seasonal change', () => {
    expect(passage('suwen-71-太阳寒水-5').quote).toBe('五之气，阳复化，草迺长，迺化迺成，民迺舒。');
    expect(passage('suwen-71-阳明燥金-5').quote).toBe('五之气，春令反行，草迺生荣，民气和。');
    expect(passage('suwen-71-厥阴风木-5').quote).toBe('五之气，燥湿更胜，沈阴迺布，寒气及体，风雨迺行。');
    expect(passage('suwen-71-少阴君火-5').quote).toContain('民迺康，其病温。');
    expect(passage('suwen-71-阳明燥金-6').quote).toContain('民迺康平，其病温。');
  });

  it('marks doubtful source glyphs instead of silently normalizing them', () => {
    expect(passage('suwen-69-金-太过').quote).toContain('两恢');
    expect(passage('suwen-69-金-太过').explanation).toContain('校勘');
    expect(passage('suwen-71-太阴湿土-annual').quote).toContain('身(月真)');
    expect(passage('suwen-71-太阴湿土-annual').explanation).toContain('校勘');
  });

  it('exposes data provenance through the existing notes field while keeping annual and period selection separate', () => {
    const result = calculateLearning(createYunQiCalendarTime({
      year: 2026, month: 11, day: 16, hour: 10, minute: 0, second: 0, millisecond: 0,
    }), fixedCalendarProvider);
    expect(CLASSICAL_READING_VERSION).toBe('YQ-CLASSICAL-READING-1.1.0');
    expect(result.notes.some((note) => note.includes(CLASSICAL_READING_VERSION))).toBe(true);
    expect(result.annualPassages[0]?.quote).toContain('岁水太过，寒气流行，邪害心火。民病身热烦心躁悸');
    expect(result.annualPassages[1]?.quote).toContain('民病欬喘');
    expect(result.currentPassages).toHaveLength(1);
    expect(result.currentPassages[0]?.id).toBe('suwen-71-少阴君火-5');
    expect(result.currentPassages[0]?.quote).toContain('民迺康，其病温。');
    expect(result.currentPassages[0]?.quote).not.toContain('民病皮腠');
  });

  it('does not reuse a passage solely because the qi period or guest qi is the same', () => {
    const at = (year: number, month: number, day: number) => calculateLearning(createYunQiCalendarTime({
      year, month, day, hour: 10, minute: 0, second: 0, millisecond: 0,
    }), fixedCalendarProvider);
    const bingWu = at(2026, 11, 16);
    const dingWei = at(2027, 11, 16);
    const wuShen = at(2028, 6, 16);

    // 子午少阴、丑未太阴、寅申少阳: explicit year witnesses, not production table rotations.
    expect(bingWu.facts.ganzhi).toBe('丙午');
    expect(dingWei.facts.ganzhi).toBe('丁未');
    expect(wuShen.facts.ganzhi).toBe('戊申');
    expect(bingWu.facts.currentStep.index).toBe(dingWei.facts.currentStep.index);
    expect(dingWei.currentPassages[0]?.quote).toContain('民病皮腠');
    expect(dingWei.currentPassages[0]?.quote).not.toContain('民迺康，其病温');

    expect(bingWu.facts.currentStep.guestQi).toBe('少阳相火');
    expect(wuShen.facts.currentStep.guestQi).toBe('少阳相火');
    expect(wuShen.currentPassages[0]?.id).toBe('suwen-71-少阳相火-3');
    expect(wuShen.currentPassages[0]?.quote).toContain('民病热中，聋瞑血溢');
    expect(wuShen.currentPassages[0]?.quote).not.toContain('民迺康，其病温');
    expect(bingWu.currentPassages[0]?.quote).not.toContain('民病热中，聋瞑血溢');
  });
});
