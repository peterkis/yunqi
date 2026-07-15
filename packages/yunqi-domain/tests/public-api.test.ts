import { describe, expect, it } from 'vitest';

import * as publicApi from '../src/index.js';
import {
  RULE_VERSION,
  calculateYearYunQi,
  calculateYunQi,
  createYunQiInstant,
  getCurrentStep,
  type CalendarProvider,
  type SixQiStep,
  type SolarTerm,
  type YunQiInstant,
  type YunQiResult,
  type YunQiYearResult,
} from '../src/index.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

const PROHIBITED_OUTPUT_PATTERN =
  /诊断|辨证|证型|处方|方剂|中药|药物|剂量|用药|治疗|疗效|预后|个性化|建议|diagnos|syndrome|prescri|dosage|medicat|treat|prognos|personalized|advice/i;

function compileTimeOnlyPublicContracts(
  provider: CalendarProvider,
  instant: YunQiInstant,
): void {
  const term: SolarTerm = '大寒';
  void term;
  calculateYearYunQi(2024, provider);
  calculateYunQi(instant, provider);
  getCurrentStep(instant, provider);

  // @ts-expect-error CalendarProvider injection is mandatory.
  calculateYearYunQi(2024);
  // @ts-expect-error Dated services accept YunQiInstant, not external strings.
  calculateYunQi('2024-05-20T21:00:00+08:00', provider);
  // @ts-expect-error CalendarProvider injection is mandatory.
  getCurrentStep(instant);
}

void compileTimeOnlyPublicContracts;

describe('stable package API', () => {
  it('exports the approved services, pure contracts, public result types, and rule version', () => {
    const provider: CalendarProvider = fixedCalendarProvider;
    const input: YunQiInstant = createYunQiInstant(1_716_210_000_000);
    const annual: YunQiYearResult = calculateYearYunQi(2024, provider);
    const dated: YunQiResult = calculateYunQi(input, provider);
    const step: SixQiStep = getCurrentStep(input, provider);

    expect('createYearExplanations' in publicApi).toBe(false);
    expect(typeof calculateYearYunQi).toBe('function');
    expect(typeof calculateYunQi).toBe('function');
    expect(typeof getCurrentStep).toBe('function');
    expect(typeof publicApi.createYunQiInstant).toBe('function');
    expect(typeof publicApi.assertYunQiInstant).toBe('function');
    expect(typeof publicApi.formatYunQiInstant).toBe('function');
    expect(typeof publicApi.getBeijingCivilYear).toBe('function');
    expect('tymeCalendarProvider' in publicApi).toBe(false);
    expect('defaultCalendarProvider' in publicApi).toBe(false);
    expect(annual.ruleVersion).toBe(RULE_VERSION);
    expect(dated.input).toBe(input);
    expect(dated.currentStep).toBe(dated.steps[2]);
    expect(step.index).toBe(3);
    expect(RULE_VERSION).toBe('V1.0-2026.7.7-implementation.1');
  });

  it('keeps every root-exported singleton object and collection runtime immutable', () => {
    const objectExports = Object.entries(publicApi)
      .flatMap(([name, value]) =>
        value !== null && typeof value === 'object'
          ? [[name, value] as [string, object]]
          : [],
      )
      .sort(([left], [right]) => left.localeCompare(right));

    expect(objectExports.map(([name]) => name)).toEqual([
      'BRANCH_QI_RULES',
      'ELEMENT_CONTROL_MAP',
      'ELEMENT_GENERATION_MAP',
      'GUEST_QI_SEQUENCE',
      'HOST_GUEST_RELATION_PRIORITY',
      'HOST_QI_SEQUENCE',
      'QI_ELEMENT_MAP',
      'SIXTY_CYCLE',
      'SIXTY_CYCLE_ANCHOR',
      'STEM_RULES',
      'STEP_BOUNDARY_TERMS',
      'STEP_NAMES',
    ]);
    expect(objectExports.every(([, value]) => Object.isFrozen(value))).toBe(true);
    expect(Object.values(publicApi.STEM_RULES).every(Object.isFrozen)).toBe(true);
    expect(Object.values(publicApi.BRANCH_QI_RULES).every(Object.isFrozen)).toBe(true);
  });
});

describe('safe rule explanations', () => {
  it('returns only deterministic annual rule facts', () => {
    const result = calculateYunQi(
      createYunQiInstant(1_716_210_000_000),
      fixedCalendarProvider,
    );

    expect(result.explanations).toEqual([
      '2024 运气年以北京时间 2024 年大寒实际交节时刻为起点。',
      '该运气年的实际区间为 2024-01-20T22:07:22+08:00 至 2025-01-20T04:00:08+08:00（左闭右开）。',
      '年干甲按规则表对应土运太过（太宫）。',
      '年支辰按规则表对应司天太阳寒水、在泉太阴湿土。',
      '三之气客气与司天同为太阳寒水。',
      '终之气客气与在泉同为太阴湿土。',
    ]);
    expect(result.explanations.join('\n')).not.toMatch(PROHIBITED_OUTPUT_PATTERN);
  });

  it('creates and freezes a new explanation collection for every calculation', () => {
    const first = calculateYearYunQi(2024, fixedCalendarProvider).explanations;
    const second = calculateYearYunQi(2024, fixedCalendarProvider).explanations;

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(second)).toBe(true);
  });
});
