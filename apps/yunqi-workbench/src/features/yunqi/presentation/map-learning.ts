import type { BirthComparisonDto, ClassicalPassageDto, LearningRelationDto, MovementStepDto, YunQiLearningDto } from '@yunqi/contracts';
import { mapCurrentYunQi, stageStatus } from './map-current-yunqi';
import { mapYunQiTime } from './map-yunqi-shared';
import { mapStageProgress } from './map-stage-progress';
import { mapMovementElement, mapMovementRelation, mapRelationTone } from './visual-mappings';
import type { CurrentYunQiViewModel, ElementKind, RelationTone, StageProgressViewModel, YunQiTimeViewModel, YunQiWheelViewModel } from './view-model';

export interface LearningRelationViewModel {
  readonly title: string;
  readonly label: string;
  readonly tone: RelationTone;
  readonly relation: string;
  readonly explanation: string;
  readonly sources: readonly { readonly id: string; readonly title: string; readonly url: string }[];
}

export interface MovementViewModel {
  readonly index: number;
  readonly name: string;
  readonly tickLabel: string;
  readonly status: ReturnType<typeof stageStatus>;
  readonly start: YunQiTimeViewModel;
  readonly end: YunQiTimeViewModel;
  readonly hostLabel: string;
  readonly guestLabel: string;
  readonly hostValue: string;
  readonly guestValue: string;
  readonly hostElement: ElementKind | undefined;
  readonly guestElement: ElementKind | undefined;
  readonly relation: Pick<LearningRelationViewModel, 'label' | 'tone' | 'explanation'>;
  readonly boundaryMethod: string;
  readonly explanation: string;
}

export interface ScopedLearningRelation extends LearningRelationViewModel {
  readonly scope: string;
  readonly heading: string;
  readonly badgeLabel: string;
}

export interface ClassicalPassageViewModel {
  readonly id: string;
  readonly work: string;
  readonly chapter: string;
  readonly section: string;
  readonly scopeLabel: string;
  readonly quote: string;
  readonly displayQuote: string;
  readonly previewQuote: string;
  readonly fullQuote: string | undefined;
  readonly source: string;
  readonly explanation: string;
  readonly sourceUrl: string;
}

export interface LearningViewModel {
  readonly facts: CurrentYunQiViewModel;
  readonly ruleVersion: string;
  readonly annualRelation: ScopedLearningRelation;
  readonly currentQi: ScopedLearningRelation;
  readonly currentMovement: MovementViewModel;
  readonly currentMovementProgress: StageProgressViewModel;
  readonly annualWheel: YunQiWheelViewModel;
  readonly movements: readonly MovementViewModel[];
  readonly annualPassages: readonly ClassicalPassageViewModel[];
  readonly currentPassages: readonly ClassicalPassageViewModel[];
  readonly notes: readonly string[];
}

export interface BirthComparisonViewModel {
  readonly birthPrecision: 'date' | 'time';
  readonly ambiguous: boolean;
  readonly message: string;
  readonly current: LearningViewModel;
  readonly candidates: readonly {
    readonly label: string;
    readonly from: YunQiTimeViewModel;
    readonly until: YunQiTimeViewModel;
    readonly learning: LearningViewModel;
    readonly comparisons: readonly LearningRelationViewModel[];
  }[];
}

export interface SnapshotElementValue {
  readonly label: string;
  readonly element: ElementKind | undefined;
}

export interface AnnualSnapshotValues {
  readonly suiYun: SnapshotElementValue;
  readonly sitian: SnapshotElementValue;
  readonly zaiquan: SnapshotElementValue;
}

export interface AnnualBirthComparisonViewModel {
  readonly birthPrecision: 'year';
  readonly ambiguous: boolean;
  readonly message: string;
  readonly current: LearningViewModel;
  readonly candidates: readonly {
    readonly label: string;
    readonly from: YunQiTimeViewModel;
    readonly until: YunQiTimeViewModel;
    readonly birthGanzhi: string;
    readonly annual: AnnualSnapshotValues;
  }[];
}
export type BirthSessionComparison = BirthComparisonViewModel | AnnualBirthComparisonViewModel;

const PASSAGE_SCOPE_LABELS: Record<string, string> = {
  'annual-movement': '年度岁运',
  'annual-qi': '年度司天',
  'qi-period': '当前阶段',
};

export function mapRelation(value: LearningRelationDto): LearningRelationViewModel {
  return { title: value.title, label: value.label, tone: mapRelationTone(value.label), relation: value.relation, explanation: value.explanation,
    sources: value.sources.map((source) => ({ id: source.id, title: source.title, url: source.url })) };
}

function scopedRelation(value: LearningRelationDto, scope: string): ScopedLearningRelation {
  const prefix = `${scope} · `;
  return { ...mapRelation(value), scope, heading: value.title.startsWith(prefix) ? value.title.slice(prefix.length) : value.title,
    badgeLabel: value.label === '相生 · 相得' ? '相得' : value.label };
}

/** Keep the complete bibliography on the link; abbreviate only recognized citation formats. */
export function compactSourceTitle(title: string): string {
  return title
    .replace(/^《黄帝内经·素问》([^·《》]+)篇第[一二三四五六七八九十百]+·(.+)$/, '《素问·$1》$2')
    .replace(/^(《[^》]+》)卷[一二三四五六七八九十百]+·(.+)$/, '$1$2');
}

function mapMovement(value: MovementStepDto, currentIndex: number): MovementViewModel {
  const status = stageStatus(value.index, currentIndex);
  return { index: value.index, name: value.name, start: mapYunQiTime(value.start), end: mapYunQiTime(value.end),
    tickLabel: value.name.replace(/运$/, ''), status: status.code === 'current' ? { ...status, label: '正在此段' } : status,
    hostLabel: `${value.host.element}运${value.host.state}（${value.host.tone}）`,
    guestLabel: `${value.guest.element}运${value.guest.state}（${value.guest.tone}）`,
    hostValue: `${value.host.element}运${value.host.state}`,
    guestValue: `${value.guest.element}运${value.guest.state}`,
    hostElement: mapMovementElement(value.host.element), guestElement: mapMovementElement(value.guest.element),
    relation: mapMovementRelation(value),
    boundaryMethod: value.boundaryMethod, explanation: value.explanation };
}

function mapPassage(value: ClassicalPassageDto, periodScopeLabel: '当前阶段' | '出生阶段'): ClassicalPassageViewModel {
  // QuoteBlock supplies the outer Chinese quotation marks. Preserve the raw
  // quote for existing consumers and strip only an already paired outer set.
  const trimmed = value.quote.trim();
  const displayQuote = trimmed.startsWith('“') && trimmed.endsWith('”') ? trimmed.slice(1, -1) : trimmed;
  const isLong = displayQuote.length > 90;
  return { id: value.id, work: value.work, chapter: value.chapter, section: value.section,
    scopeLabel: value.scope === 'qi-period' ? periodScopeLabel : PASSAGE_SCOPE_LABELS[value.scope] ?? '经典学习', quote: value.quote,
    displayQuote, previewQuote: isLong ? `${displayQuote.slice(0, 90)}……` : displayQuote,
    fullQuote: isLong ? displayQuote : undefined,
    source: `《${value.work}·${value.chapter}》${value.section}（摘录）`,
    explanation: value.explanation, sourceUrl: value.sourceUrl };
}

export function mapLearning(value: YunQiLearningDto, periodScopeLabel: '当前阶段' | '出生阶段' = '当前阶段'): LearningViewModel {
  const facts = mapCurrentYunQi(value.facts);
  const movements = value.movements.map(step => mapMovement(step, value.currentMovement.index));
  const currentMovementProgress = mapStageProgress(value.currentMovementProgress, {
    startLabel: value.currentMovement.startLabel, endLabel: value.currentMovement.endLabel,
    endLocalTime: value.currentMovement.end.localTime, transition: '交运',
  });
  return { facts, ruleVersion: value.ruleVersion,
    annualRelation: scopedRelation(value.annualRelation, '全年'), currentQi: scopedRelation(value.currentQi, facts.currentStep.name),
    currentMovement: mapMovement(value.currentMovement, value.currentMovement.index), movements,
    currentMovementProgress,
    annualWheel: {
      label: `年轮：外环六步气，当前第${facts.currentStep.index}步${facts.currentStep.name}，${facts.currentStepProgress.elapsedLabel}；内环五步运，当前第${value.currentMovement.index}运${value.currentMovement.name}，${currentMovementProgress.elapsedLabel}`,
      ganzhi: facts.summary.stemBranch.ganzhi,
      annualLabel: `${facts.summary.suiYun.element}运${facts.summary.suiYun.state}之年`,
      qi: facts.timeline.map((step) => ({ index: step.index, tickLabel: step.tickLabel, status: step.status.code })),
      movements: movements.map(step => ({ index: step.index, status: step.status.code })),
    },
    annualPassages: value.annualPassages.map((passage) => mapPassage(passage, periodScopeLabel)),
    currentPassages: value.currentPassages.map((passage) => mapPassage(passage, periodScopeLabel)), notes: [...value.notes] };
}

export function mapBirthComparison(value: BirthComparisonDto): BirthComparisonViewModel {
  return { birthPrecision: value.birthPrecision, ambiguous: value.ambiguous, message: value.message.replace('，统一采用固定北京时间 UTC+08', ''),
    current: mapLearning(value.current), candidates: value.candidates.map((candidate) => ({
      label: candidate.label, from: mapYunQiTime(candidate.from), until: mapYunQiTime(candidate.until),
      learning: mapLearning(candidate.learning, '出生阶段'), comparisons: candidate.comparisons.map(mapRelation),
    })) };
}
