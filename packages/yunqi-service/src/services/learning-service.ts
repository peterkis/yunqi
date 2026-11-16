import {
  addBeijingCalendarDays,
  calculateLearning,
  CLASSICAL_SOURCES,
  compareElements,
  QI_ELEMENT_MAP,
  type CalendarProvider,
  type ClassicalPassage,
  type LearningRelation,
  type MovementStep,
  type YunQiCalendarTime,
  type YunQiLearning,
} from '@yunqi/domain';
import { mapCalculationResult } from '../mappers/yunqi-mapper.js';
import {
  compareCalendarTimes,
  formatYunQiCalendarTime,
  normalizeBirthRequest,
  normalizeCalculateRequest,
  normalizeYunQiInstant,
} from '../modules/time-normalizer/index.js';
import type {
  BirthComparisonDto,
  BirthRequest,
  LearningRelationDto,
  YunQiLearningDto,
} from '../schemas/learning.js';
import type { CalculateRequest } from '../schemas/yunqi.js';
import { InvalidArgumentError } from './invalid-argument-error.js';
import { protectCalendarProvider } from './provider-boundary.js';
import { assertSupportedYear } from './yunqi-service.js';

function mapClassicalPassage(passage: ClassicalPassage) {
  return {
    id: passage.id,
    work: passage.work,
    chapter: passage.chapter,
    section: passage.section,
    scope: passage.scope,
    quote: passage.quote,
    explanation: passage.explanation,
    sourceUrl: passage.sourceUrl,
  };
}

function mapMovementStep(step: MovementStep) {
  return {
    ...step,
    host: { ...step.host },
    guest: { ...step.guest },
    start: formatYunQiCalendarTime(normalizeYunQiInstant(step.start)),
    end: formatYunQiCalendarTime(normalizeYunQiInstant(step.end)),
  };
}

function mapRelation(relation: LearningRelation): LearningRelationDto {
  return {
    ...relation,
    sourceIds: [...relation.sourceIds],
    sources: relation.sourceIds.map((id) => {
      const source = CLASSICAL_SOURCES[id];
      return {
        id,
        title: `《${source.work}》${source.chapter}`,
        url: source.sourceUrl,
      };
    }),
  };
}

export function mapLearning(result: YunQiLearning): YunQiLearningDto {
  return {
    ruleVersion: result.ruleVersion,
    facts: mapCalculationResult(result.facts),
    annualRelation: mapRelation(result.annualRelation),
    currentQi: mapRelation(result.currentQi),
    currentMovement: mapMovementStep(result.currentMovement),
    movements: result.movements.map(mapMovementStep),
    annualPassages: result.annualPassages.map(mapClassicalPassage),
    currentPassages: result.currentPassages.map(mapClassicalPassage),
    notes: [...result.notes],
  };
}

function learningAt(
  input: YunQiCalendarTime,
  provider: CalendarProvider,
): YunQiLearning {
  if (input.localDateTime.year < 1900 || input.localDateTime.year > 2101) {
    throw new InvalidArgumentError('请求时点超出支持范围');
  }
  try {
    const result = calculateLearning(input, protectCalendarProvider(provider));
    assertSupportedYear(result.facts.year);
    return result;
  } catch (error) {
    if (error instanceof RangeError) {
      throw new InvalidArgumentError('请求时点无效', { cause: error });
    }
    throw error;
  }
}

export function calculateLearningDto(
  input: YunQiCalendarTime,
  provider: CalendarProvider,
): YunQiLearningDto {
  return mapLearning(learningAt(input, provider));
}

export function calculateLearningRequestDto(
  request: CalculateRequest,
  provider: CalendarProvider,
): YunQiLearningDto {
  return calculateLearningDto(normalizeCalculateRequest(request), provider);
}

function compareLearningDimensions(
  birth: YunQiLearning,
  current: YunQiLearning,
): LearningRelationDto[] {
  return [
    compareElements(
      '中运对照',
      birth.facts.suiYun.element,
      current.facts.suiYun.element,
    ),
    compareElements(
      '司天对照',
      QI_ELEMENT_MAP[birth.facts.sitian],
      QI_ELEMENT_MAP[current.facts.sitian],
    ),
    compareElements(
      '在泉对照',
      QI_ELEMENT_MAP[birth.facts.zaiquan],
      QI_ELEMENT_MAP[current.facts.zaiquan],
    ),
    compareElements(
      '客运对照',
      birth.currentMovement.guest.element,
      current.currentMovement.guest.element,
    ),
    compareElements(
      '客气对照',
      QI_ELEMENT_MAP[birth.facts.currentStep.guestQi],
      QI_ELEMENT_MAP[current.facts.currentStep.guestQi],
    ),
  ].map(mapRelation);
}

export function calculateBirthComparison(
  request: BirthRequest,
  now: YunQiCalendarTime,
  provider: CalendarProvider,
): BirthComparisonDto {
  const { from, precision } = normalizeBirthRequest(request);
  if (compareCalendarTimes(from, now) > 0) {
    throw new InvalidArgumentError('出生时间不能晚于当前时点');
  }
  const current = learningAt(now, provider);
  const initial = learningAt(from, provider);
  if (precision === 'time') {
    return {
      ruleVersion: initial.ruleVersion,
      birthPrecision: 'time',
      ambiguous: false,
      message: '按所填公历出生时刻计算，统一采用固定北京时间 UTC+08；不依据生日判定九种体质或个体疾病风险。',
      current: mapLearning(current),
      candidates: [{
        label: '已知出生时刻',
        from: formatYunQiCalendarTime(from),
        until: formatYunQiCalendarTime(from),
        learning: mapLearning(initial),
        comparisons: compareLearningDimensions(initial, current),
      }],
    };
  }

  const nextDay = addBeijingCalendarDays(from, 1);
  const until = compareCalendarTimes(nextDay, now) > 0 ? now : nextDay;
  const final = learningAt(until, provider);

  // Partition the date at every actual qi/year or selected movement boundary.
  // A date-only request therefore never silently assumes midnight or noon.
  const boundaries = [initial, final].flatMap((result) => [
    ...result.facts.steps.map((step) => step.start),
    result.facts.end,
    ...result.movements.map((step) => step.start),
  ]).filter((instant) =>
    instant.epochMilliseconds > from.instant.epochMilliseconds
    && instant.epochMilliseconds < until.instant.epochMilliseconds,
  );
  const points = [from.instant, ...boundaries, until.instant];
  const sorted = [...new Map(
    points.map((point) => [point.epochMilliseconds, point]),
  ).values()].sort((a, b) => a.epochMilliseconds - b.epochMilliseconds);
  const starts = sorted.length === 1 ? sorted : sorted.slice(0, -1);
  const candidates = starts.map((start, index) => {
    const sample = normalizeYunQiInstant(start);
    const learning = learningAt(sample, provider);
    const candidateEnd = normalizeYunQiInstant(sorted[index + 1] ?? start);
    return {
      label: starts.length === 1
        ? '当日已知时段归属一致'
        : `可能归属 ${index + 1}`,
      from: formatYunQiCalendarTime(sample),
      until: formatYunQiCalendarTime(candidateEnd),
      learning: mapLearning(learning),
      comparisons: compareLearningDimensions(learning, current),
    };
  });

  return {
    ruleVersion: initial.ruleVersion,
    birthPrecision: 'date',
    ambiguous: candidates.length > 1,
    message: candidates.length > 1
      ? '出生时间不详，所填日期跨运气交界；请按真实出生时间核对以下候选，不能任选一个作为确定结论。区间左闭右开。'
      : '出生时间不详；所填日期已发生的时段归属一致。下列区间用于核对，不是推定的出生时刻。',
    current: mapLearning(current),
    candidates,
  };
}
