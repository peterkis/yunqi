import type { SixQiStepDto, SuiYunDto } from '@yunqi/contracts';
import type { ElementKind, RelationTone } from './view-model';

// Exact API labels (LearningRelationDto.label is a string in Contract 1.2.0).
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

const QI_ELEMENTS = {
  厥阴风木: 'wood', 少阴君火: 'fire', 太阴湿土: 'earth',
  少阳相火: 'fire', 阳明燥金: 'metal', 太阳寒水: 'water',
} as const satisfies Record<SixQiStepDto['hostQi'], ElementKind>;

const MOVEMENT_ELEMENTS = {
  木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water',
} as const satisfies Record<SuiYunDto['element'], ElementKind>;

export function mapQiElement(value: string): ElementKind | undefined {
  return Object.hasOwn(QI_ELEMENTS, value) ? QI_ELEMENTS[value as keyof typeof QI_ELEMENTS] : undefined;
}

export function mapMovementElement(value: string): ElementKind | undefined {
  return Object.hasOwn(MOVEMENT_ELEMENTS, value)
    ? MOVEMENT_ELEMENTS[value as keyof typeof MOVEMENT_ELEMENTS] : undefined;
}
