import type { BirthComparisonDto, ClassicalPassageDto, LearningRelationDto, MovementStepDto, YunQiLearningDto } from '@yunqi/contracts';
import { mapCurrentYunQi } from './map-current-yunqi';
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
  readonly annualRelation: LearningRelationViewModel;
  readonly currentQi: LearningRelationViewModel;
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

const PASSAGE_SCOPE_LABELS: Record<string, string> = {
  'annual-movement': '年度岁运',
  'annual-qi': '年度司天',
  'qi-period': '当前阶段',
};

function mapRelation(value: LearningRelationDto): LearningRelationViewModel {
  return { title: value.title, label: value.label, tone: mapRelationTone(value.label), relation: value.relation, explanation: value.explanation,
    sources: value.sources.map((source) => ({ id: source.id, title: source.title, url: source.url })) };
}

function mapMovement(value: MovementStepDto): MovementViewModel {
  return { index: value.index, name: value.name, start: mapYunQiTime(value.start), end: mapYunQiTime(value.end),
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
  const currentMovementProgress = mapStageProgress(value.currentMovementProgress, {
    startLabel: value.currentMovement.startLabel, endLabel: value.currentMovement.endLabel,
    endLocalTime: value.currentMovement.end.localTime, transition: '交运',
  });
  return { facts, ruleVersion: value.ruleVersion,
    annualRelation: mapRelation(value.annualRelation), currentQi: mapRelation(value.currentQi),
    currentMovement: mapMovement(value.currentMovement), movements: value.movements.map(mapMovement),
    currentMovementProgress,
    annualWheel: {
      label: `年轮：外环六步气，当前第${facts.currentStep.index}步${facts.currentStep.name}，${facts.currentStepProgress.elapsedLabel}；内环五步运，当前第${value.currentMovement.index}运${value.currentMovement.name}，${currentMovementProgress.elapsedLabel}`,
      ganzhi: facts.summary.stemBranch.ganzhi,
      annualLabel: `${facts.summary.suiYun.element}运${facts.summary.suiYun.state}之年`,
      qi: facts.timeline.map((step) => ({ index: step.index, tickLabel: step.tickLabel, status: step.status.code })),
      movements: value.movements.map((step) => ({ index: step.index,
        status: step.index < value.currentMovement.index ? 'completed' : step.index === value.currentMovement.index ? 'current' : 'upcoming',
      })),
    },
    annualPassages: value.annualPassages.map((passage) => mapPassage(passage, periodScopeLabel)),
    currentPassages: value.currentPassages.map((passage) => mapPassage(passage, periodScopeLabel)), notes: [...value.notes] };
}

export function mapBirthComparison(value: BirthComparisonDto): BirthComparisonViewModel {
  return { birthPrecision: value.birthPrecision, ambiguous: value.ambiguous, message: value.message,
    current: mapLearning(value.current), candidates: value.candidates.map((candidate) => ({
      label: candidate.label, from: mapYunQiTime(candidate.from), until: mapYunQiTime(candidate.until),
      learning: mapLearning(candidate.learning, '出生阶段'), comparisons: candidate.comparisons.map(mapRelation),
    })) };
}
