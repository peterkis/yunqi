import {
  ELEMENT_CONTROL_MAP,
  ELEMENT_GENERATION_MAP,
  HOST_GUEST_RELATION_PRIORITY,
  QI_ELEMENT_MAP,
} from '../rules/phase1-rules.js';
import type { Element, HostGuestRelation, Qi } from '../types.js';

interface RelationContext {
  host: Qi;
  guest: Qi;
  hostElement: Element;
  guestElement: Element;
}

type RelationMatcher = (context: RelationContext) => boolean;

const RELATION_MATCHERS = Object.freeze({
  SAME_QI: ({ host, guest }: RelationContext) => host === guest,
  SAME_ELEMENT_DIFFERENT_QI: ({
    host,
    guest,
    hostElement,
    guestElement,
  }: RelationContext) => host !== guest && hostElement === guestElement,
  HOST_GENERATES_GUEST: ({ hostElement, guestElement }: RelationContext) =>
    ELEMENT_GENERATION_MAP[hostElement] === guestElement,
  GUEST_GENERATES_HOST: ({ hostElement, guestElement }: RelationContext) =>
    ELEMENT_GENERATION_MAP[guestElement] === hostElement,
  HOST_CONTROLS_GUEST: ({ hostElement, guestElement }: RelationContext) =>
    ELEMENT_CONTROL_MAP[hostElement] === guestElement,
  GUEST_CONTROLS_HOST: ({ hostElement, guestElement }: RelationContext) =>
    ELEMENT_CONTROL_MAP[guestElement] === hostElement,
} satisfies Readonly<Record<HostGuestRelation, RelationMatcher>>);

export function calculateHostGuestRelation(host: Qi, guest: Qi): HostGuestRelation {
  const context: RelationContext = {
    host,
    guest,
    hostElement: QI_ELEMENT_MAP[host],
    guestElement: QI_ELEMENT_MAP[guest],
  };

  for (const relation of HOST_GUEST_RELATION_PRIORITY) {
    if (RELATION_MATCHERS[relation](context)) {
      return relation;
    }
  }

  throw new Error('Frozen host/guest relation rule tables are internally inconsistent');
}
