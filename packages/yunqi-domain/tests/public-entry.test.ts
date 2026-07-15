import { describe, expect, it } from 'vitest';
import {
  BRANCH_QI_RULES,
  ELEMENT_CONTROL_MAP,
  ELEMENT_GENERATION_MAP,
  GUEST_QI_SEQUENCE,
  HOST_GUEST_RELATION_PRIORITY,
  HOST_QI_SEQUENCE,
  QI_ELEMENT_MAP,
  RULE_VERSION,
  SIXTY_CYCLE,
  SIXTY_CYCLE_ANCHOR,
  STEM_RULES,
  STEP_BOUNDARY_TERMS,
  STEP_NAMES,
  createYunQiInstant,
  type Element,
  type HostGuestRelation,
  type Qi,
  type SolarTerm,
  type YunQiInstant,
} from '../src/index.js';

describe('package source entrypoint', () => {
  it('re-exports public types and immutable runtime rule constants', () => {
    const element: Element = QI_ELEMENT_MAP['厥阴风木'];
    const qi: Qi = HOST_QI_SEQUENCE[0];
    const relation: HostGuestRelation = HOST_GUEST_RELATION_PRIORITY[0];
    const term: SolarTerm = STEP_BOUNDARY_TERMS[0];
    const instant: YunQiInstant = createYunQiInstant(1_705_759_642_000);

    expect({ element, qi, relation, term, instant }).toEqual({
      element: '木',
      qi: '厥阴风木',
      relation: 'SAME_QI',
      term: '大寒',
      instant: {
        epochMilliseconds: 1_705_759_642_000,
        timezone: 'Asia/Shanghai',
      },
    });
    expect(RULE_VERSION).toBe('V1.0-2026.7.7-implementation.1');
    expect(SIXTY_CYCLE_ANCHOR.year).toBe(1984);
    expect(SIXTY_CYCLE[0]).toBe('甲子');
    expect(STEM_RULES.甲.tone).toBe('太宫');
    expect(BRANCH_QI_RULES.子.sitian).toBe('少阴君火');
    expect(GUEST_QI_SEQUENCE[2]).toBe('太阴湿土');
    expect(STEP_NAMES[0]).toBe('初之气');
    expect(STEP_BOUNDARY_TERMS[0]).toBe('大寒');
    expect(ELEMENT_GENERATION_MAP.木).toBe('火');
    expect(ELEMENT_CONTROL_MAP.木).toBe('土');
    expect([
      SIXTY_CYCLE,
      STEM_RULES,
      BRANCH_QI_RULES,
      HOST_QI_SEQUENCE,
      GUEST_QI_SEQUENCE,
      STEP_NAMES,
      STEP_BOUNDARY_TERMS,
      QI_ELEMENT_MAP,
      ELEMENT_GENERATION_MAP,
      ELEMENT_CONTROL_MAP,
      HOST_GUEST_RELATION_PRIORITY,
    ].every(Object.isFrozen)).toBe(true);
  });
});
