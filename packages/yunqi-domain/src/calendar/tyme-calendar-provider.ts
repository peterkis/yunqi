import { SolarTerm } from 'tyme4ts';

import type { BeijingDateTime, SixStepBoundaryTerm } from '../types.js';
import { formatBeijingFields, validateBeijingDateTime } from './beijing-time.js';
import type { CalendarProvider } from './calendar-provider.js';

function getSolarTermTime(year: number, term: SixStepBoundaryTerm): BeijingDateTime {
  const solarTerm = SolarTerm.fromName(year, term);

  if (solarTerm.getYear() !== year || solarTerm.getName() !== term) {
    throw new RangeError(`节气查询结果与请求不一致：${year} ${term}`);
  }

  const solarTime = solarTerm.getJulianDay().getSolarTime();

  if (solarTime.getYear() !== year) {
    throw new RangeError(`节气时间年份与请求不一致：${year} ${term}`);
  }

  const iso = formatBeijingFields(
    solarTime.getYear(),
    solarTime.getMonth(),
    solarTime.getDay(),
    solarTime.getHour(),
    solarTime.getMinute(),
    solarTime.getSecond(),
  );
  const epochMilliseconds = Date.parse(iso);
  const result = { iso, epochMilliseconds };

  validateBeijingDateTime(result, `${year} ${term}节气时间`);

  return result;
}

export const tymeCalendarProvider: CalendarProvider = Object.freeze({
  getSolarTermTime,
});

export const defaultCalendarProvider: CalendarProvider = tymeCalendarProvider;
