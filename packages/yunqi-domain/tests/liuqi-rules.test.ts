import { describe, expect, it } from 'vitest';

import { calculateGuestQi, getHostQi } from '../src/liuqi/host-guest.js';
import { getSitianZaiquan } from '../src/liuqi/sitian-zaiquan.js';
import { calculateHostGuestRelation } from '../src/relation/host-guest-relation.js';
import {
  GUEST_QI_SEQUENCE,
  HOST_GUEST_RELATION_PRIORITY,
  QI_ELEMENT_MAP,
} from '../src/rules/phase1-rules.js';
import type { EarthlyBranch, Qi } from '../src/types.js';
import * as publicApi from '../src/index.js';

const branchQiMatrix = [
  ['子', '少阴君火', '阳明燥金'],
  ['丑', '太阴湿土', '太阳寒水'],
  ['寅', '少阳相火', '厥阴风木'],
  ['卯', '阳明燥金', '少阴君火'],
  ['辰', '太阳寒水', '太阴湿土'],
  ['巳', '厥阴风木', '少阳相火'],
  ['午', '少阴君火', '阳明燥金'],
  ['未', '太阴湿土', '太阳寒水'],
  ['申', '少阳相火', '厥阴风木'],
  ['酉', '阳明燥金', '少阴君火'],
  ['戌', '太阳寒水', '太阴湿土'],
  ['亥', '厥阴风木', '少阳相火'],
] as const satisfies readonly (readonly [EarthlyBranch, Qi, Qi])[];

describe('Sitian, Zaiquan, and host/guest qi', () => {
  it.each(branchQiMatrix)(
    '%s uses the exact Sitian/Zaiquan mapping and aligns guest steps 3 and 6',
    (branch, sitian, zaiquan) => {
      expect(getSitianZaiquan(branch)).toEqual({ sitian, zaiquan });

      const guestQi = calculateGuestQi(sitian);
      expect(guestQi).toHaveLength(6);
      expect(guestQi[2]).toBe(sitian);
      expect(guestQi[5]).toBe(zaiquan);
    },
  );

  it.each([
    [1, '厥阴风木'],
    [2, '少阴君火'],
    [3, '少阳相火'],
    [4, '太阴湿土'],
    [5, '阳明燥金'],
    [6, '太阳寒水'],
  ] as const)('returns the exact host qi for 1-based position %i', (index, qi) => {
    expect(getHostQi(index)).toBe(qi);
  });

  it('returns a newly frozen exact 2024 guest-qi sequence', () => {
    const first = calculateGuestQi('太阳寒水');
    const second = calculateGuestQi('太阳寒水');

    expect(first).toEqual([
      '少阳相火',
      '阳明燥金',
      '太阳寒水',
      '厥阴风木',
      '少阴君火',
      '太阴湿土',
    ]);
    expect(first).not.toBe(GUEST_QI_SEQUENCE);
    expect(second).not.toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(second)).toBe(true);
  });
});

describe('host/guest relation classification', () => {
  it.each([
    ['厥阴风木', '厥阴风木', 'SAME_QI'],
    ['少阴君火', '少阳相火', 'SAME_ELEMENT_DIFFERENT_QI'],
    ['厥阴风木', '少阴君火', 'HOST_GENERATES_GUEST'],
    ['少阴君火', '厥阴风木', 'GUEST_GENERATES_HOST'],
    ['厥阴风木', '太阴湿土', 'HOST_CONTROLS_GUEST'],
    ['太阴湿土', '厥阴风木', 'GUEST_CONTROLS_HOST'],
  ] as const)('classifies %s / %s as %s', (host, guest, expected) => {
    expect(calculateHostGuestRelation(host, guest)).toBe(expected);
  });

  it('resolves the complete 6 x 6 qi cross-product to declared relations', () => {
    const qiValues = Object.keys(QI_ELEMENT_MAP) as Qi[];
    const results = qiValues.flatMap((host) =>
      qiValues.map((guest) => calculateHostGuestRelation(host, guest)),
    );

    expect(results).toHaveLength(36);
    expect(results.every((relation) => HOST_GUEST_RELATION_PRIORITY.includes(relation))).toBe(
      true,
    );
  });
});

describe('LiuQi package public API', () => {
  it('re-exports all four calculators by identity from the package root', () => {
    expect(publicApi.getSitianZaiquan).toBe(getSitianZaiquan);
    expect(publicApi.getHostQi).toBe(getHostQi);
    expect(publicApi.calculateGuestQi).toBe(calculateGuestQi);
    expect(publicApi.calculateHostGuestRelation).toBe(calculateHostGuestRelation);
  });
});
