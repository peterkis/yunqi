import { MOVEMENT_RELATION_LABELS } from '../learning/rules.js';
import { ELEMENT_CONTROL_MAP, ELEMENT_GENERATION_MAP } from '../rules/phase1-rules.js';
import type { HostGuestDirection, MovementRelationResult, SuiYun } from '../types.js';

/**
 * Five-movement host/guest relation (teaching rules 1.3.0, expert-confirmed):
 * generation is 相得 with its direction kept; control follows 主胜逆、客胜从;
 * a shared element only states whether 太/少 differ.
 */
export function calculateMovementRelation(host: SuiYun, guest: SuiYun): MovementRelationResult {
  const sameElement = host.element === guest.element;
  const direction: HostGuestDirection = sameElement ? 'NONE'
    : ELEMENT_GENERATION_MAP[host.element] === guest.element ? 'HOST_GENERATES_GUEST'
    : ELEMENT_GENERATION_MAP[guest.element] === host.element ? 'GUEST_GENERATES_HOST'
    : ELEMENT_CONTROL_MAP[host.element] === guest.element ? 'HOST_CONTROLS_GUEST'
    : 'GUEST_CONTROLS_HOST';
  const traditionalLabel = direction === 'NONE'
    ? MOVEMENT_RELATION_LABELS[host.state === guest.state ? 'SAME_ELEMENT_SAME_STATE' : 'SAME_ELEMENT_DIFFERENT_STATE']
      .replace('{element}', host.element)
    : MOVEMENT_RELATION_LABELS[direction];

  return Object.freeze({
    elementRelation: sameElement ? 'SAME_ELEMENT' : 'DIFFERENT_ELEMENT',
    direction,
    traditionalLabel,
  });
}
