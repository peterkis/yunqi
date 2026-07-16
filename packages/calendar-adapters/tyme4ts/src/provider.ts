import {
  createYunQiCalendarTime,
  type CalendarProvider,
  type SolarTerm,
  type YunQiInstant,
} from '@yunqi/domain';
import { SolarTerm as TymeSolarTerm } from 'tyme4ts';

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

    return createYunQiCalendarTime({
      year: solarTime.getYear(),
      month: solarTime.getMonth(),
      day: solarTime.getDay(),
      hour: solarTime.getHour(),
      minute: solarTime.getMinute(),
      second: solarTime.getSecond(),
      millisecond: 0,
    }).instant;
  }
}

export const tyme4tsCalendarProvider: Tyme4tsCalendarProvider = Object.freeze(
  new Tyme4tsCalendarProvider(),
);
