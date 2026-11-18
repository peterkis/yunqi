import type { HostGuestRelationDto, MovementRelationDto, MovementStepDto, SixQiStepDto, SuiYunDto } from '@yunqi/contracts';
import type { ElementKind, RelationTone } from './view-model';

// Exact API labels (LearningRelationDto.label is a string in Contract 1.3.0).
// Include compound values emitted by the teaching API; never parse an
// explanation, split a label, or infer a relation from the two elements.
const RELATION_TONES = {
  顺: 'favorable', 从: 'favorable', 相得: 'favorable', 顺化: 'favorable', 相生: 'favorable',
  '顺 · 君位臣': 'favorable', '顺 · 客胜主': 'favorable', '从 · 顺': 'favorable',
  '相生 · 相得': 'favorable', 出生生当前: 'favorable', 当前生出生: 'favorable',
  逆: 'adverse', 不和: 'adverse', 天刑: 'adverse', 小逆: 'adverse', 相克: 'adverse',
  '逆 · 臣位君': 'adverse', '逆 · 主胜客': 'adverse',
  出生克当前: 'adverse', 当前克出生: 'adverse',
  同五行: 'neutral', 天符: 'neutral', 同属: 'neutral', 同气: 'neutral',
  同一六气: 'neutral', '不同六气，同五行': 'neutral',
} as const satisfies Readonly<Record<string, RelationTone>>;

export function mapRelationTone(value: string): RelationTone {
  return Object.hasOwn(RELATION_TONES, value)
    ? RELATION_TONES[value as keyof typeof RELATION_TONES]
    : 'neutral';
}

// Core responses expose a direction enum rather than a teaching label. Use
// that field directly; these styles never describe a patient or severity.
interface DirectionPresentation {
  readonly tone: RelationTone;
  readonly verb: string | null;
}

const RELATION_DIRECTIONS = {
  NONE: { tone: 'neutral', verb: null },
  HOST_GENERATES_GUEST: { tone: 'favorable', verb: '主气生客气' },
  GUEST_GENERATES_HOST: { tone: 'favorable', verb: '客气生主气' },
  HOST_CONTROLS_GUEST: { tone: 'adverse', verb: '主气克客气' },
  GUEST_CONTROLS_HOST: { tone: 'adverse', verb: '客气克主气' },
} as const satisfies Readonly<Record<HostGuestRelationDto['direction'], DirectionPresentation>>;

export function mapRelationDirection(value: string): DirectionPresentation {
  return Object.hasOwn(RELATION_DIRECTIONS, value)
    ? RELATION_DIRECTIONS[value as keyof typeof RELATION_DIRECTIONS]
    : RELATION_DIRECTIONS.NONE;
}

// Five-movement relations have their own teaching scope. The DTO direction
// supplies the verb/order; no element-generation or control rules live here.
const MOVEMENT_RELATION_DIRECTIONS = {
  NONE: { tone: 'neutral', verb: null, guestFirst: false },
  HOST_GENERATES_GUEST: { tone: 'favorable', verb: '生', guestFirst: false },
  GUEST_GENERATES_HOST: { tone: 'favorable', verb: '生', guestFirst: true },
  HOST_CONTROLS_GUEST: { tone: 'neutral', verb: '克', guestFirst: false },
  GUEST_CONTROLS_HOST: { tone: 'neutral', verb: '克', guestFirst: true },
} as const satisfies Readonly<Record<MovementRelationDto['direction'], {
  readonly tone: RelationTone;
  readonly verb: '生' | '克' | null;
  readonly guestFirst: boolean;
}>>;

export function mapMovementRelation(value: MovementStepDto): {
  readonly label: string;
  readonly tone: RelationTone;
  readonly explanation: string;
} {
  const label = value.relation.traditionalLabel;
  if (value.relation.elementRelation === 'SAME_ELEMENT') {
    return { label, tone: 'neutral', explanation: '' };
  }
  const { tone, verb, guestFirst } = MOVEMENT_RELATION_DIRECTIONS[value.relation.direction];
  const explanation = verb === null ? '' : guestFirst
    ? `客${value.guest.element}${verb}主${value.host.element}`
    : `主${value.host.element}${verb}客${value.guest.element}`;
  return { label, tone, explanation };
}

const QI_ELEMENTS = {
  厥阴风木: 'wood', 少阴君火: 'fire', 太阴湿土: 'earth',
  少阳相火: 'fire', 阳明燥金: 'metal', 太阳寒水: 'water',
} as const satisfies Record<SixQiStepDto['hostQi'], ElementKind>;

const MOVEMENT_ELEMENTS = {
  木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water',
} as const satisfies Record<SuiYunDto['element'], ElementKind>;

// Known contract values are exhaustive; unrecognized future strings have no
// element color. Preserve the precise type for callers with a contract enum.
export function mapQiElement(value: SixQiStepDto['hostQi']): ElementKind;
export function mapQiElement(value: string): ElementKind | undefined;
export function mapQiElement(value: string): ElementKind | undefined {
  return Object.hasOwn(QI_ELEMENTS, value) ? QI_ELEMENTS[value as keyof typeof QI_ELEMENTS] : undefined;
}

export function mapMovementElement(value: SuiYunDto['element']): ElementKind;
export function mapMovementElement(value: string): ElementKind | undefined;
export function mapMovementElement(value: string): ElementKind | undefined {
  return Object.hasOwn(MOVEMENT_ELEMENTS, value)
    ? MOVEMENT_ELEMENTS[value as keyof typeof MOVEMENT_ELEMENTS] : undefined;
}
