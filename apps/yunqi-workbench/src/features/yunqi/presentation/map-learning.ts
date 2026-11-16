import type { BirthComparisonDto, ClassicalPassageDto, LearningRelationDto, MovementStepDto, YunQiLearningDto } from '@yunqi/contracts';
import { mapCurrentYunQi } from './map-current-yunqi';
import { mapYunQiTime } from './map-yunqi-shared';
import type { CurrentYunQiViewModel, YunQiTimeViewModel } from './view-model';

export interface LearningRelationViewModel {
  readonly title: string;
  readonly label: string;
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
  readonly explanation: string;
  readonly sourceUrl: string;
}

export interface LearningViewModel {
  readonly facts: CurrentYunQiViewModel;
  readonly ruleVersion: string;
  readonly annualRelation: LearningRelationViewModel;
  readonly currentQi: LearningRelationViewModel;
  readonly currentMovement: MovementViewModel;
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
  return { title: value.title, label: value.label, relation: value.relation, explanation: value.explanation,
    sources: value.sources.map((source) => ({ id: source.id, title: source.title, url: source.url })) };
}

function mapMovement(value: MovementStepDto): MovementViewModel {
  return { index: value.index, name: value.name, start: mapYunQiTime(value.start), end: mapYunQiTime(value.end),
    hostLabel: `${value.host.element}运${value.host.state}（${value.host.tone}）`,
    guestLabel: `${value.guest.element}运${value.guest.state}（${value.guest.tone}）`,
    boundaryMethod: value.boundaryMethod, explanation: value.explanation };
}

function mapPassage(value: ClassicalPassageDto): ClassicalPassageViewModel {
  return { id: value.id, work: value.work, chapter: value.chapter, section: value.section,
    scopeLabel: PASSAGE_SCOPE_LABELS[value.scope] ?? '经典学习', quote: value.quote,
    explanation: value.explanation, sourceUrl: value.sourceUrl };
}

export function mapLearning(value: YunQiLearningDto): LearningViewModel {
  return { facts: mapCurrentYunQi(value.facts), ruleVersion: value.ruleVersion,
    annualRelation: mapRelation(value.annualRelation), currentQi: mapRelation(value.currentQi),
    currentMovement: mapMovement(value.currentMovement), movements: value.movements.map(mapMovement),
    annualPassages: value.annualPassages.map(mapPassage), currentPassages: value.currentPassages.map(mapPassage), notes: [...value.notes] };
}

export function mapBirthComparison(value: BirthComparisonDto): BirthComparisonViewModel {
  return { birthPrecision: value.birthPrecision, ambiguous: value.ambiguous, message: value.message,
    current: mapLearning(value.current), candidates: value.candidates.map((candidate) => ({
      label: candidate.label, from: mapYunQiTime(candidate.from), until: mapYunQiTime(candidate.until),
      learning: mapLearning(candidate.learning), comparisons: candidate.comparisons.map(mapRelation),
    })) };
}
