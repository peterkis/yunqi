import { LunarYear, SolarDay } from 'tyme4ts';

/** The reported year is always Gregorian. The same lunar month/day can occur twice. */
export function resolveLunarBirthday(year: number, month: number, day: number, leap?: boolean) {
  const first = SolarDay.fromYmd(year, 1, 1).getLunarDay().getYear();
  const last = SolarDay.fromYmd(year, 12, 31).getLunarDay().getYear();
  const matches = [];
  for (let lunarYear = first; lunarYear <= last; lunarYear++) {
    for (const period of LunarYear.fromYear(lunarYear).getMonths()) {
      if (period.getMonth() !== month || (leap !== undefined && period.isLeap() !== leap) || day > period.getDayCount()) continue;
      const lunar = period.getFirstDay().next(day - 1);
      const solar = lunar.getSolarDay();
      if (solar.getYear() !== year) continue;
      const birthDate = [year, String(solar.getMonth()).padStart(2, '0'), String(solar.getDay()).padStart(2, '0')].join('-');
      matches.push({ birthDate, lunarLabel: period.getName() + lunar.getName(), leap: period.isLeap() });
    }
  }
  return matches;
}
