import type { BirthComparisonDto, BirthYearComparisonDto, YunQiLearningDto } from '@yunqi/contracts';
import { mapYunQiTime } from '../../presentation/map-yunqi-shared';
import { mapLearning, mapRelation, type BirthSessionComparison, type AnnualBirthComparisonViewModel, mapBirthComparison, type BirthComparisonViewModel, type LearningRelationViewModel } from '../../presentation/map-learning';
import { mapPanelSummary, type PanelSummaryViewModel } from '../../presentation/panel-summary';
import { mapMovementElement, mapQiElement } from '../../presentation/visual-mappings';
import type { ElementKind, YunQiTimeViewModel } from '../../presentation/view-model';
import { mapCalculationTimes, type YunQiTimeEntryViewModel } from '../../presentation/map-drilldown';
import type { ClassicsCardViewModel } from '../../presentation/map-classics';

export interface BirthFactViewModel {
  readonly label: string;
  readonly element?: ElementKind;
  readonly detail: readonly string[];
}

export interface BirthRowViewModel {
  readonly label: string;
  readonly birth: BirthFactViewModel;
  readonly current: BirthFactViewModel;
  readonly relation?: LearningRelationViewModel;
}

export interface BirthReadingViewModel {
  readonly id: string;
  readonly scope: string;
  readonly quote: string;
  readonly excerpt: string;
  readonly fullQuote?: string;
  readonly source: string;
  readonly sourceUrl: string;
  readonly interpretation: string;
  readonly card: ClassicsCardViewModel;
}

interface BirthExcerptViewModel extends Pick<BirthReadingViewModel, 'id' | 'excerpt' | 'source'> {
  readonly label: string;
  readonly element?: ElementKind;
}

export interface BirthCandidateViewModel {
  readonly label: string;
  readonly from: YunQiTimeViewModel;
  readonly until: YunQiTimeViewModel;
  readonly birthTime?: YunQiTimeViewModel;
  readonly birthYear: number;
  readonly birthGanzhi: string;
  readonly rows: readonly BirthRowViewModel[];
  readonly annualReadings: readonly BirthReadingViewModel[];
  readonly periodReadings: readonly BirthReadingViewModel[];
  readonly excerpts: readonly BirthExcerptViewModel[];
  readonly calculationTimes: readonly YunQiTimeEntryViewModel[];
}

export interface BirthPageViewModel<T extends BirthSessionComparison = BirthSessionComparison> {
  readonly comparison: T;
  readonly summary: PanelSummaryViewModel;
  readonly candidates: readonly BirthCandidateViewModel[];
  readonly currentYear: number;
  readonly currentGanzhi: string;
  readonly currentTime: YunQiTimeViewModel;
  readonly currentReadings: readonly BirthReadingViewModel[];
  readonly candidateMeta: string | undefined;
  readonly calculationTimes: readonly YunQiTimeEntryViewModel[];
}

function facts(value: YunQiLearningDto): readonly BirthFactViewModel[] {
  const { suiYun, sixQi, currentStep } = value.facts;
  const movement = value.currentMovement;
  return [
    { label: `${suiYun.element}运${suiYun.state}`, element: mapMovementElement(suiYun.element), detail: [suiYun.tone] },
    { label: sixQi.sitian, element: mapQiElement(sixQi.sitian), detail: [] },
    { label: sixQi.zaiquan, element: mapQiElement(sixQi.zaiquan), detail: [] },
    { label: currentStep.name, element: mapQiElement(currentStep.guestQi), detail: [`主 ${currentStep.hostQi}`, `客 ${currentStep.guestQi}`] },
    { label: movement.name, element: mapMovementElement(movement.guest.element), detail: [`主 ${movement.host.tone}`, `客 ${movement.guest.tone}`] },
  ];
}

function reading(value: YunQiLearningDto['annualPassages'][number], periodScope: string): BirthReadingViewModel {
  // QuoteBlock owns the outer quotation marks. Preserve any marks within the text.
  const quote = value.quote.startsWith('“') && value.quote.endsWith('”') ? value.quote.slice(1, -1) : value.quote;
  const characters = Array.from(quote);
  const excerpt = characters.length > 56 ? `${characters.slice(0, 56).join('')}……` : quote;
  return {
    id: value.id, scope: value.scope === 'qi-period' ? periodScope : value.scope === 'annual-movement' ? '全年 · 岁运' : '全年 · 司天',
    quote, excerpt, fullQuote: characters.length > 56 ? quote : undefined,
    source: `《${value.work}·${value.chapter}》${value.section}`, sourceUrl: value.sourceUrl,
    interpretation: value.explanation,
    card: {
      heading: value.section,
      badge: value.scope === 'qi-period' ? periodScope : '全年适用', isCurrent: false,
      quote: excerpt, fullQuote: characters.length > 56 ? quote : undefined,
      interpretation: value.explanation, sourceTitle: `《${value.work}·${value.chapter}》`,
      sourceSection: value.section, sourceUrl: value.sourceUrl,
    },
  };
}

export function mapBirthYearView(value: BirthYearComparisonDto): BirthPageViewModel<AnnualBirthComparisonViewModel> {
  const current = mapLearning(value.current);
  const currentFacts = facts(value.current);
  const candidates = value.candidates.map(candidate => {
    const { suiYun, sitian, zaiquan } = candidate;
    const element = mapMovementElement(suiYun.element);
    const valueLabel = `${suiYun.element}运${suiYun.state}`;
    const annual = {
      suiYun: { label: valueLabel, element, detail: [suiYun.tone] },
      sitian: { label: sitian, element: mapQiElement(sitian), detail: [] },
      zaiquan: { label: zaiquan, element: mapQiElement(zaiquan), detail: [] },
    };
    const birthFacts = [annual.suiYun, annual.sitian, annual.zaiquan];
    const annualReadings = candidate.annualPassages.map(passage => reading(passage, '全年'));
    const from = mapYunQiTime(candidate.from);
    const until = mapYunQiTime(candidate.until);
    const rows = ['中运对照', '司天对照', '在泉对照'].map((name, index) => {
      const relation = candidate.comparisons.find(item => item.title === name);
      return { label: ['岁运', '司天', '在泉'][index], birth: birthFacts[index], current: currentFacts[index],
        relation: relation && mapRelation(relation) };
    });
    return { label: candidate.label, from, until, birthYear: candidate.year, birthGanzhi: candidate.ganzhi,
      rows, annualReadings, periodReadings: [], calculationTimes: [{ label: '可计算区间', start: from, end: until }],
      excerpts: annualReadings.map((item, index) => ({ ...item, label: item.card.heading,
        element: candidate.annualPassages[index].scope === 'annual-movement' ? element : mapQiElement(sitian) })),
      annual };
  });
  return {
    comparison: { birthPrecision: 'year', current, candidates, ambiguous: candidates.length > 1, message: value.message },
    summary: mapPanelSummary(current.facts.summary, { step: current.facts.currentStep, relation: current.currentQi }),
    candidates, currentYear: value.current.facts.year, currentGanzhi: value.current.facts.stemBranch.ganzhi,
    currentTime: current.facts.inputTime, candidateMeta: undefined,
    currentReadings: value.current.annualPassages.map(passage => reading(passage, '全年')),
    calculationTimes: mapCalculationTimes({ ...current.facts, stages: current.facts.timeline, movements: current.movements }),
  };
}

export function mapBirthView(value: BirthComparisonDto): BirthPageViewModel<BirthComparisonViewModel> {
  const comparison = mapBirthComparison(value);
  const currentFacts = facts(value.current);
  // Service order is movement before qi. Match named dimensions, never array positions.
  const dimensions = [
    ['岁运', '中运对照'], ['司天', '司天对照'], ['在泉', '在泉对照'],
    ['所处气', '客气对照'], ['所处运', '客运对照'],
  ] as const;
  return {
    comparison,
    summary: mapPanelSummary(comparison.current.facts.summary, { step: comparison.current.facts.currentStep, relation: comparison.current.currentQi }),
    currentYear: value.current.facts.year,
    currentGanzhi: value.current.facts.stemBranch.ganzhi,
    currentTime: comparison.current.facts.inputTime,
    candidateMeta: !comparison.ambiguous && comparison.candidates.length === 1
      ? comparison.birthPrecision === 'date' ? '当日无交界 · 归属唯一' : '时刻已知 · 归属唯一'
      : undefined,
    calculationTimes: mapCalculationTimes({ ...comparison.current.facts, stages: comparison.current.facts.timeline, movements: comparison.current.movements }),
    currentReadings: [...value.current.annualPassages, ...value.current.currentPassages].map((passage) => reading(passage, '当下阶段')),
    candidates: value.candidates.map((candidate, index) => {
      const birthFacts = facts(candidate.learning);
      const relations = comparison.candidates[index].comparisons;
      const annualReadings = candidate.learning.annualPassages.map((passage) => reading(passage, '出生阶段'));
      const periodReadings = candidate.learning.currentPassages.map((passage) => reading(passage, '出生阶段'));
      const excerpts: BirthExcerptViewModel[] = [];
      const annual = annualReadings[0];
      const period = periodReadings[0];
      const { suiYun, sixQi, currentStep } = candidate.learning.facts;
      const sitianElement = mapQiElement(sixQi.sitian);
      if (annual) {
        const element = candidate.learning.annualPassages[0].scope === 'annual-movement'
          ? mapMovementElement(suiYun.element) : sitianElement;
        excerpts.push({ id: annual.id, excerpt: annual.excerpt, source: annual.source, label: annual.card.heading, element });
      }
      if (period) {
        const [regime] = period.card.heading.split('·');
        const label = regime.endsWith('之政') ? `${currentStep.name} · ${regime}` : period.card.heading;
        excerpts.push({ id: period.id, excerpt: period.excerpt, source: period.source, label, element: sitianElement });
      }
      const learning = comparison.candidates[index].learning;
      return {
        label: candidate.label, from: comparison.candidates[index].from, until: comparison.candidates[index].until,
        birthTime: comparison.candidates[index].learning.facts.inputTime,
        birthYear: candidate.learning.facts.year, birthGanzhi: candidate.learning.facts.stemBranch.ganzhi,
        rows: dimensions.map(([label, title], position) => {
          const relation = relations.find((item) => item.title === title);
          return { label, birth: birthFacts[position], current: currentFacts[position], relation };
        }),
        annualReadings, periodReadings,
        excerpts,
        calculationTimes: [
          ...(comparison.birthPrecision === 'date' ? [{ label: '可能出生区间', start: comparison.candidates[index].from, end: comparison.candidates[index].until }] : []),
          ...mapCalculationTimes({ ...learning.facts, stages: learning.facts.timeline, movements: learning.movements }),
        ],
      };
    }),
  };
}
