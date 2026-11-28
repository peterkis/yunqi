import type { BirthComparisonRequest, BirthYearRequest } from '@yunqi/contracts';

export type BirthSubmission = BirthYearRequest | BirthComparisonRequest;

export interface BirthDraft {
  mode: 'age' | 'year';
  primary: string;
  calendar: 'solar' | 'lunar';
  month: string;
  day: string;
  selected: string;
  knowsTime: boolean;
  time: string;
}
export const emptyBirthDraft: BirthDraft = {
  mode: 'age', primary: '', calendar: 'solar', month: '', day: '', selected: '', knowsTime: false, time: '',
};

export interface BirthReferenceDate {
  year: number;
  month: number;
  day: number;
}

/** A later month alone is conclusive; this month's day must be known. */
export function birthdayAdjustment(draft: BirthDraft, today: BirthReferenceDate | undefined): '月' | '日' | undefined {
  if (!today || draft.calendar !== 'solar') return undefined;
  const month = Number(draft.month);
  if (month > today.month) return '月';
  if (month === today.month && Number(draft.day) > today.day) return '日';
  return undefined;
}

export function birthYear(draft: BirthDraft, today: BirthReferenceDate | undefined) {
  if (!draft.primary || !today) return undefined;
  const value = Number(draft.primary);
  if (draft.mode === 'age' && value > 120) return undefined;
  if (draft.mode === 'year' && draft.primary.length !== 4) return undefined;
  const year = draft.mode === 'age' ? today.year - value - (birthdayAdjustment(draft, today) ? 1 : 0) : value;
  return year >= 1900 && year <= Math.min(2100, today.year) ? year : undefined;
}

/** A known attained age allows either of two adjacent Gregorian birth years. */
export function lunarAgeBirthYears(age: string, referenceYear: number | undefined): number[] {
  if (!age || !referenceYear || Number(age) > 120) return [];
  const latest = referenceYear - Number(age);
  return [latest - 1, latest].filter(year => year >= 1900 && year <= 2100);
}

export function attainedAge(birthDate: string, today: BirthReferenceDate): number {
  const year = Number(birthDate.slice(0, 4));
  const month = Number(birthDate.slice(5, 7));
  const day = Number(birthDate.slice(8, 10));
  const birthdayAhead = month > today.month || (month === today.month && day > today.day);
  return today.year - year - Number(birthdayAhead);
}

export type BirthSlot = 'primary' | 'month' | 'day';

function maxDay(draft: BirthDraft, year: number | undefined) {
  if (draft.calendar === 'lunar') return 30;
  const month = Number(draft.month);
  if (draft.mode === 'year' && draft.primary.length === 4) year = Number(draft.primary);
  if (month === 2) {
    const leap = year === undefined || (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0));
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Validate the proposed value before committing it to the draft. */
export function slotError(key: BirthSlot, raw: string, draft: BirthDraft, today: BirthReferenceDate | undefined) {
  if (raw === '') return '';
  if (!/^\d+$/.test(raw)) return '请使用数字填写';
  const value = Number(raw);
  if (key === 'primary') {
    if (draft.mode === 'age') return raw.length > 3 || value > 120 ? '年龄须为 0–120 岁' : '';
    const upper = Math.min(today?.year ?? 2100, 2100);
    if (raw.length > 4 || Number(raw.padEnd(4, '9')) < 1900 || Number(raw.padEnd(4, '0')) > upper)
      return `出生年份须在 1900–${upper} 年之间`;
    return '';
  }
  const next = { ...draft, [key]: raw };
  const upper = key === 'month' ? 12 : maxDay(next, birthYear(next, today));
  if (raw.length > 2 || value < 1 || value > upper)
    return `${key === 'month' ? '出生月' : '出生日'}须为 1–${upper}`;
  return '';
}

export function dayError(draft: BirthDraft, year: number | undefined) {
  const month = Number(draft.month), day = Number(draft.day);
  if (draft.month && (month > 12 || draft.month === '00')) return '请核对出生月（1–12）';
  if (!draft.day) return '';
  if (!month) return '请先填写出生月';
  const limit = maxDay(draft, year);
  return day > limit || day < 1 ? `请核对出生日（1–${limit}）` : '';
}
