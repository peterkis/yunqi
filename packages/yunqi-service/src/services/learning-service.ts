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
import { resolveLunarBirthday } from '@yunqi/calendar-adapter-tyme4ts';
import { mapCalculationResult, mapStageProgress } from '../mappers/yunqi-mapper.js';
import {
  compareCalendarTimes,
  formatYunQiCalendarTime,
  nextCalendarMillisecond,
  normalizeBirthRequest,
  normalizeCalculateRequest,
  normalizeYunQiInstant,
  previousCalendarMillisecond,
} from '../modules/time-normalizer/index.js';
import type {
  BirthComparisonDto, BirthDatePreviewRequest, BirthDatePreviewDto, BirthYearComparisonDto,
  BirthRequest,
  LearningRelationDto,
  MovementStepDto,
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

function mapMovementStep(step: MovementStep): MovementStepDto {
  return {
    index: step.index,
    name: step.name,
    host: { ...step.host },
    guest: { ...step.guest },
    start: formatYunQiCalendarTime(normalizeYunQiInstant(step.start)),
    end: formatYunQiCalendarTime(normalizeYunQiInstant(step.end)),
    startLabel: step.startLabel,
    endLabel: step.endLabel,
    relation: { ...step.relation },
    boundaryMethod: step.boundaryMethod,
    explanation: step.explanation,
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
    currentMovementProgress: mapStageProgress(result.currentMovementProgress),
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

function compareAnnualDimensions(
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
  ].map(mapRelation);
}

function compareLearningDimensions(birth: YunQiLearning, current: YunQiLearning): LearningRelationDto[] {
  return [...compareAnnualDimensions(birth, current), ...[
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
  ].map(mapRelation)];
}

// A date straddling the supported lower bound can still have an eligible interval.
function supportedDayStart(start: YunQiCalendarTime, provider: CalendarProvider) {
  if (start.localDateTime.year !== 1900) return start;
  const minimum = normalizeYunQiInstant(protectCalendarProvider(provider).getSolarTermInstant(1900, '大寒'));
  if (compareCalendarTimes(addBeijingCalendarDays(start, 1), minimum) <= 0) throw new InvalidArgumentError('出生日期早于支持范围');
  return compareCalendarTimes(start, minimum) < 0 ? minimum : start;
}

export function calculateBirthYear(year: number, now: YunQiCalendarTime, provider: CalendarProvider): BirthYearComparisonDto {
  assertSupportedYear(year);
  if (year > now.localDateTime.year) throw new InvalidArgumentError('出生年份不能晚于当前年份');
  const start = normalizeBirthRequest({ birthDate: `${year}-01-01` }).from;
  const boundary = normalizeYunQiInstant(protectCalendarProvider(provider).getSolarTermInstant(year, '大寒'));
  const until = year === now.localDateTime.year ? nextCalendarMillisecond(now)
    : normalizeBirthRequest({ birthDate: `${year + 1}-01-01` }).from;
  const current = learningAt(now, provider);
  const candidates: BirthYearComparisonDto['candidates'] = [];
  function append(label: string, from: YunQiCalendarTime, end: YunQiCalendarTime) {
    if (compareCalendarTimes(from, end) >= 0) return;
    const birth = learningAt(from, provider);
    candidates.push({ label, from: formatYunQiCalendarTime(from), until: formatYunQiCalendarTime(end),
      year: birth.facts.year, ganzhi: birth.facts.ganzhi, suiYun: { ...birth.facts.suiYun },
      sitian: birth.facts.sitian, zaiquan: birth.facts.zaiquan,
      annualPassages: birth.annualPassages.map(mapClassicalPassage), comparisons: compareAnnualDimensions(birth, current) });
  }
  if (year > 1900) append('大寒交节前', start, compareCalendarTimes(boundary, until) < 0 ? boundary : until);
  append('大寒交节起', boundary, until);
  return { birthPrecision: 'year', current: mapLearning(current), candidates,
    message: year === 1900 ? '仅年份对照 · 可计算范围从 1900 年大寒交节起' : '仅年份对照 · 按大寒交节划分可能归属' };
}

export function previewBirthDate(request: BirthDatePreviewRequest, now: YunQiCalendarTime, provider: CalendarProvider): BirthDatePreviewDto {
  const { year, month, day } = request;
  if (year > now.localDateTime.year || (request.calendar === 'solar' && request.leap !== undefined)) {
    throw new InvalidArgumentError('出生日期或历法选项无效');
  }
  const dates = request.calendar === 'lunar' ? resolveLunarBirthday(year, month, day, request.leap)
    : [{ birthDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, lunarLabel: '', leap: false }];
  const matches: BirthDatePreviewDto['matches'] = [];
  for (const date of dates) {
    const start = normalizeBirthRequest({ birthDate: date.birthDate }).from;
    if (compareCalendarTimes(start, now) > 0) continue;
    const end = addBeijingCalendarDays(start, 1);
    const minimum = year === 1900 && normalizeYunQiInstant(protectCalendarProvider(provider).getSolarTermInstant(1900, '大寒'));
    if (minimum && compareCalendarTimes(end, minimum) <= 0) continue;
    const first = learningAt(supportedDayStart(start, provider), provider);
    const last = learningAt(previousCalendarMillisecond(end), provider);
    // Show a boundary later today as a calendar fact, without assigning it to a birth before now.
    const lastPossible = compareCalendarTimes(end, now) <= 0 ? last : learningAt(now, provider);
    const boundaries = new Map<string, { label: string; at: ReturnType<typeof formatYunQiCalendarTime> }>();
    for (const learning of [first, last]) {
      const events = [
        { label: '大寒交运气年', instant: learning.facts.start },
        ...learning.facts.steps.map(step => ({ label: `交气 · ${step.name}`, instant: step.start })),
        ...learning.movements.map(step => ({ label: `交运 · ${step.name}`, instant: step.start })),
      ];
      for (const { label, instant } of events) {
        const at = formatYunQiCalendarTime(normalizeYunQiInstant(instant));
        if (at.localTime.startsWith(date.birthDate)) {
          boundaries.set(label, { label, at });
        }
      }
    }
    const annualLabels = [...new Set([first, lastPossible].map(({ facts }) => `${facts.ganzhi}年 · ${facts.suiYun.element}运${facts.suiYun.state}`))];
    matches.push({ ...date, annualLabels, boundaries: [...boundaries.values()] });
  }
  return { matches };
}

export function calculateBirthComparison(
  request: BirthRequest,
  now: YunQiCalendarTime,
  provider: CalendarProvider,
): BirthComparisonDto {
  const normalized = normalizeBirthRequest(request);
  const precision = normalized.precision;
  const start = normalized.from;
  const from = precision === 'date' ? supportedDayStart(start, provider) : start;
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

  const nextDay = addBeijingCalendarDays(start, 1);
  // Include the current valid millisecond while retaining a right-open range.
  const afterNow = nextCalendarMillisecond(now);
  const until = compareCalendarTimes(nextDay, afterNow) > 0 ? afterNow : nextDay;
  // The excluded endpoint may belong to another, even unsupported, year.
  // Only sample the last millisecond that actually belongs to the interval.
  const final = learningAt(previousCalendarMillisecond(until), provider);

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
