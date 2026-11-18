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

describe('five-movement relation directions', () => {
  it.each(MOVEMENTS)('matches all guest elements for host $element', (host) => {
    for (const [guestIndex, guest] of MOVEMENTS.entries()) {
      const direction = DIRECTIONS[MOVEMENTS.indexOf(host)][guestIndex];
      const result = calculateMovementRelation(host, guest);
      expect(result.direction).toBe(direction);
      expect(result.elementRelation).toBe(direction === 'NONE' ? 'SAME_ELEMENT' : 'DIFFERENT_ELEMENT');
      expect(Object.keys(result).sort()).toEqual(['direction', 'elementRelation', 'traditionalLabel']);
      expect(Object.isFrozen(result)).toBe(true);
      expect(result.traditionalLabel).not.toMatch(/相得|顺|逆/);
    }
  });

  it('uses the host element in a neutral same-element label regardless of tone or state', () => {
    expect(calculateMovementRelation(
      { element: '水', state: '太过', tone: '太羽' },
      { element: '水', state: '不及', tone: '少羽' },
    )).toEqual({ elementRelation: 'SAME_ELEMENT', direction: 'NONE', traditionalLabel: '同属水' });
  });
});
