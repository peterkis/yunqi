import {
  assertYunQiCalendarTime,
  type YunQiCalendarTime,
} from '@yunqi/domain';

export interface FormattedYunQiCalendarTime {
  readonly localTime: string;
  readonly epochMilliseconds: number;
  readonly offset: '+08:00';
  readonly calendarTimeStandard: 'BeijingStandardTime+08:00';
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

export function formatYunQiCalendarTime(
  value: YunQiCalendarTime,
): FormattedYunQiCalendarTime {
  assertYunQiCalendarTime(value, 'API 输出时间');
  const local = value.localDateTime;
  const fractional =
    local.millisecond === 0 ? '' : `.${pad(local.millisecond, 3)}`;

  return {
    localTime:
      `${pad(local.year, 4)}-${pad(local.month)}-${pad(local.day)}` +
      `T${pad(local.hour)}:${pad(local.minute)}:${pad(local.second)}` +
      `${fractional}+08:00`,
    epochMilliseconds: value.instant.epochMilliseconds,
    offset: value.instant.offset,
    calendarTimeStandard: value.calendarTimeStandard,
  };
}
