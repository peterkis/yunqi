import {
  createYunQiInstant,
  type CalendarProvider,
  type SolarTerm,
  type YunQiInstant,
} from '@yunqi/domain';
import { SolarTerm as TymeSolarTerm } from 'tyme4ts';

const BEIJING_OFFSET_MILLISECONDS = 8 * 60 * 60 * 1_000;

interface BeijingCivilFields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function toEpochMilliseconds(fields: BeijingCivilFields): number {
  const wallClock = new Date(0);
  wallClock.setUTCFullYear(fields.year, fields.month - 1, fields.day);
  wallClock.setUTCHours(fields.hour, fields.minute, fields.second, 0);

  if (
    !Number.isFinite(wallClock.getTime()) ||
    wallClock.getUTCFullYear() !== fields.year ||
    wallClock.getUTCMonth() + 1 !== fields.month ||
    wallClock.getUTCDate() !== fields.day ||
    wallClock.getUTCHours() !== fields.hour ||
    wallClock.getUTCMinutes() !== fields.minute ||
    wallClock.getUTCSeconds() !== fields.second
  ) {
    throw new RangeError('tyme4ts 返回的北京时间字段无效');
  }

  return wallClock.getTime() - BEIJING_OFFSET_MILLISECONDS;
}

export class Tyme4tsCalendarProvider implements CalendarProvider {
  getSolarTermInstant(year: number, term: SolarTerm): YunQiInstant {
    const solarTerm = TymeSolarTerm.fromName(year, term);

    if (solarTerm.getYear() !== year || solarTerm.getName() !== term) {
      throw new RangeError(`节气查询结果与请求不一致：${year} ${term}`);
    }

    const solarTime = solarTerm.getJulianDay().getSolarTime();

    if (solarTime.getYear() !== year) {
      throw new RangeError(`节气时间年份与请求不一致：${year} ${term}`);
    }

    const epochMilliseconds = toEpochMilliseconds({
      year: solarTime.getYear(),
      month: solarTime.getMonth(),
      day: solarTime.getDay(),
      hour: solarTime.getHour(),
      minute: solarTime.getMinute(),
      second: solarTime.getSecond(),
    });

    return createYunQiInstant(epochMilliseconds);
  }
}

export const tyme4tsCalendarProvider: Tyme4tsCalendarProvider = Object.freeze(
  new Tyme4tsCalendarProvider(),
);
