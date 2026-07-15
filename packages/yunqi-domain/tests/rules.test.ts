import { describe, expect, it } from 'vitest';
import {
  BRANCH_QI_RULES,
  GUEST_QI_SEQUENCE,
  HOST_QI_SEQUENCE,
  RULE_VERSION,
  SIXTY_CYCLE,
  STEM_RULES,
} from '../src/rules/phase1-rules.js';

describe('Phase 1 rule tables', () => {
  it('exposes the versioned complete tables without merging the two fire qi', () => {
    expect(RULE_VERSION).toBe('V1.0-2026.7.7-implementation.1');
    expect(SIXTY_CYCLE).toHaveLength(60);
    expect(new Set(SIXTY_CYCLE).size).toBe(60);
    expect(Object.keys(STEM_RULES)).toHaveLength(10);
    expect(Object.keys(BRANCH_QI_RULES)).toHaveLength(12);
    expect(HOST_QI_SEQUENCE[1]).toBe('少阴君火');
    expect(HOST_QI_SEQUENCE[2]).toBe('少阳相火');
    expect(GUEST_QI_SEQUENCE).toEqual([
      '厥阴风木', '少阴君火', '太阴湿土',
      '少阳相火', '阳明燥金', '太阳寒水',
    ]);
  });
});
