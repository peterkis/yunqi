import { describe, expect, it } from 'vitest';

import { calculateMovementRelation, type SuiYun } from '../src/index.js';

const MOVEMENTS = [
  { element: '木', state: '太过', tone: '太角' },
  { element: '火', state: '不及', tone: '少徵' },
  { element: '土', state: '太过', tone: '太宫' },
  { element: '金', state: '不及', tone: '少商' },
  { element: '水', state: '太过', tone: '太羽' },
] as const satisfies readonly SuiYun[];

// Hand-written ordered-pair oracle; do not derive from production element maps.
const DIRECTIONS = [
  ['NONE', 'HOST_GENERATES_GUEST', 'HOST_CONTROLS_GUEST', 'GUEST_CONTROLS_HOST', 'GUEST_GENERATES_HOST'],
  ['GUEST_GENERATES_HOST', 'NONE', 'HOST_GENERATES_GUEST', 'HOST_CONTROLS_GUEST', 'GUEST_CONTROLS_HOST'],
  ['GUEST_CONTROLS_HOST', 'GUEST_GENERATES_HOST', 'NONE', 'HOST_GENERATES_GUEST', 'HOST_CONTROLS_GUEST'],
  ['HOST_CONTROLS_GUEST', 'GUEST_CONTROLS_HOST', 'GUEST_GENERATES_HOST', 'NONE', 'HOST_GENERATES_GUEST'],
  ['HOST_GENERATES_GUEST', 'HOST_CONTROLS_GUEST', 'GUEST_CONTROLS_HOST', 'GUEST_GENERATES_HOST', 'NONE'],
] as const;

// Expert-confirmed teaching-rule 1.3.0 labels, written out by hand.
const LABELS = {
  NONE: '同属{element}运 · 太少相同',
  HOST_GENERATES_GUEST: '相得 · 主生客',
  GUEST_GENERATES_HOST: '相得 · 客生主',
  HOST_CONTROLS_GUEST: '逆 · 主胜客',
  GUEST_CONTROLS_HOST: '顺 · 客胜主',
} as const;

describe('five-movement relation directions', () => {
  it.each(MOVEMENTS)('matches all guest elements for host $element', (host) => {
    for (const [guestIndex, guest] of MOVEMENTS.entries()) {
      const direction = DIRECTIONS[MOVEMENTS.indexOf(host)][guestIndex];
      const result = calculateMovementRelation(host, guest);
      expect(result.direction).toBe(direction);
      expect(result.elementRelation).toBe(direction === 'NONE' ? 'SAME_ELEMENT' : 'DIFFERENT_ELEMENT');
      expect(Object.keys(result).sort()).toEqual(['direction', 'elementRelation', 'traditionalLabel']);
      expect(Object.isFrozen(result)).toBe(true);
      expect(result.traditionalLabel).toBe(LABELS[direction].replace('{element}', host.element));
    }
  });

  it.each([
    ['木', '太角', '少角', '同属木运 · 太少不同', '同属木运 · 太少相同'],
    ['火', '太徵', '少徵', '同属火运 · 太少不同', '同属火运 · 太少相同'],
    ['土', '太宫', '少宫', '同属土运 · 太少不同', '同属土运 · 太少相同'],
    ['金', '太商', '少商', '同属金运 · 太少不同', '同属金运 · 太少相同'],
    ['水', '太羽', '少羽', '同属水运 · 太少不同', '同属水运 · 太少相同'],
  ] as const)('states whether 太/少 match for %s in either host/guest order', (element, excessTone, deficientTone, different, same) => {
    const excess = { element, state: '太过', tone: excessTone } as const;
    const deficient = { element, state: '不及', tone: deficientTone } as const;
    for (const [host, guest, traditionalLabel] of [
      [excess, deficient, different], [deficient, excess, different],
      [excess, excess, same], [deficient, deficient, same],
    ] as const) {
      const result = calculateMovementRelation(host, guest);
      expect(result).toEqual({ elementRelation: 'SAME_ELEMENT', direction: 'NONE', traditionalLabel });
      expect(Object.isFrozen(result)).toBe(true);
    }
  });
});
