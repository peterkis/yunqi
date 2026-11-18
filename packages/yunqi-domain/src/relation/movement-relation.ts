import { MOVEMENT_RELATION_LABELS } from '../learning/rules.js';
import { ELEMENT_CONTROL_MAP, ELEMENT_GENERATION_MAP } from '../rules/phase1-rules.js';
import type { HostGuestDirection, MovementRelationResult, SuiYun } from '../types.js';

/** Five-movement teaching relations describe only the element direction. */
export function calculateMovementRelation(host: SuiYun, guest: SuiYun): MovementRelationResult {
  const sameElement = host.element === guest.element;
  const direction: HostGuestDirection = sameElement ? 'NONE'
    : ELEMENT_GENERATION_MAP[host.element] === guest.element ? 'HOST_GENERATES_GUEST'
    : ELEMENT_GENERATION_MAP[guest.element] === host.element ? 'GUEST_GENERATES_HOST'
    : ELEMENT_CONTROL_MAP[host.element] === guest.element ? 'HOST_CONTROLS_GUEST'
    : 'GUEST_CONTROLS_HOST';

  return Object.freeze({
    elementRelation: sameElement ? 'SAME_ELEMENT' : 'DIFFERENT_ELEMENT',
    direction,
    traditionalLabel: MOVEMENT_RELATION_LABELS[direction].replace('{element}', host.element),
  });
}
