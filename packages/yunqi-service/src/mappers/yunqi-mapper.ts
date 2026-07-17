import type {
  HostGuestRelationResult,
  SixQiStep,
  YunQiCalendarResult,
  YunQiCalendarTime,
  YunQiInstant,
  YunQiYearResult,
} from '@yunqi/domain';
import {
  formatYunQiCalendarTime,
  normalizeYunQiInstant,
} from '../modules/time-normalizer/index.js';
import type {
  HostGuestRelationDto,
  SixQiStepDto,
  YunQiCalculationDto,
  YunQiTimeDto,
  YunQiYearDto,
} from '../schemas/yunqi.js';

function mapCalendarTime(
  value: YunQiCalendarTime,
): YunQiTimeDto {
  return formatYunQiCalendarTime(value);
}

function mapInstant(value: YunQiInstant): YunQiTimeDto {
  return mapCalendarTime(normalizeYunQiInstant(value));
}

function mapRelation(value: HostGuestRelationResult): HostGuestRelationDto {
  return {
    qiRelation: value.qiRelation,
    elementRelation: value.elementRelation,
    direction: value.direction,
    traditionalLabel: value.traditionalLabel,
  };
}

function mapStep(value: SixQiStep): SixQiStepDto {
  return {
    index: value.index,
    name: value.name,
    start: mapInstant(value.start),
    end: mapInstant(value.end),
    hostQi: value.hostQi,
    guestQi: value.guestQi,
    relation: mapRelation(value.relation),
  };
}

export function mapYearResult(value: YunQiYearResult): YunQiYearDto {
  return {
    ruleVersion: value.ruleVersion,
    year: value.year,
    stemBranch: {
      ganzhi: value.ganzhi,
      stem: value.stem,
      branch: value.branch,
    },
    interval: {
      start: mapInstant(value.start),
      end: mapInstant(value.end),
    },
    suiYun: { ...value.suiYun },
    sixQi: {
      sitian: value.sitian,
      zaiquan: value.zaiquan,
      steps: value.steps.map(mapStep),
    },
    explanations: [...value.explanations],
  };
}

export function mapCalculationResult(
  value: YunQiCalendarResult,
): YunQiCalculationDto {
  return {
    ...mapYearResult(value),
    input: mapCalendarTime(value.input),
    currentStep: mapStep(value.currentStep),
  };
}
