import type { ElementDotProps } from '../../../components/design/ElementDot';
import type { RelationChipProps } from '../../../components/design/RelationChip';
import type { SixQiStageViewModel, YunQiYearSummaryViewModel } from './view-model';

type Element = ElementDotProps['element'];

const elements = {
  木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water',
} as const satisfies Record<YunQiYearSummaryViewModel['suiYun']['element'], Element>;

const qiElements = {
  厥阴风木: 'wood', 少阴君火: 'fire', 少阳相火: 'fire',
  太阴湿土: 'earth', 阳明燥金: 'metal', 太阳寒水: 'water',
} as const satisfies Record<SixQiStageViewModel['hostQi'], Element>;

export function mapDrilldownSummary(summary: YunQiYearSummaryViewModel) {
  return {
    ...summary,
    boundaryMeta: `交运 ${summary.interval.start.localTime.slice(5, 16).replace('T', ' ')}`,
    movementElement: elements[summary.suiYun.element],
    sitianElement: qiElements[summary.sitian],
    zaiquanElement: qiElements[summary.zaiquan],
  };
}

// These styles describe the API direction, never a patient or a severity level.
const directions = {
  NONE: { tone: 'neutral', verb: null },
  HOST_GENERATES_GUEST: { tone: 'favorable', verb: '主气生客气' },
  GUEST_GENERATES_HOST: { tone: 'favorable', verb: '客气生主气' },
  HOST_CONTROLS_GUEST: { tone: 'adverse', verb: '主气克客气' },
  GUEST_CONTROLS_HOST: { tone: 'adverse', verb: '客气克主气' },
} as const satisfies Record<SixQiStageViewModel['relation']['direction']['code'], {
  readonly tone: RelationChipProps['tone']; readonly verb: string | null;
}>;

export function mapDrilldownStage(stage: SixQiStageViewModel) {
  const direction = directions[stage.relation.direction.code];
  return {
    ...stage,
    hostElement: qiElements[stage.hostQi],
    guestElement: qiElements[stage.guestQi],
    relationTone: direction?.tone ?? 'neutral',
    relationExplanation: direction?.verb
      ? `${direction.verb}；主气为${stage.hostQi}，客气为${stage.guestQi}。`
      : `主气为${stage.hostQi}，客气为${stage.guestQi}；${stage.relation.element.label}。`,
  };
}
