import { describe, expect, it } from 'vitest';
import { birthYear, emptyBirthDraft, slotError, type BirthDraft } from './birth-entry';

const today = { year: 2026, month: 11, day: 23 };
const age: BirthDraft = { ...emptyBirthDraft, primary: '46' };

describe('age on the service reference date', () => {
  it.each([
    ['', '', 1980], ['10', '', 1980], ['11', '', 1980], ['11', '23', 1980],
    ['11', '24', 1979], ['12', '', 1979], ['12', '15', 1979],
  ] as const)('resolves month %s day %s to %s', (month, day, expected) => {
    expect(birthYear({ ...age, month, day }, today)).toBe(expected);
  });
  it('keeps the anchor civil year for lunar month/day and a manually supplied year', () => {
    expect(birthYear({ ...age, month: '12', day: '15', calendar: 'lunar' }, today)).toBe(1980);
    expect(birthYear({ ...age, mode: 'year', primary: '1980', month: '12', day: '15' }, today)).toBe(1980);
  });
  it('validates month and day against the entered year rather than a derived age', () => {
    const draft = { ...age, yearBeforeAge: 1980, month: '02' };
    const january = { ...today, month: 1 };
    expect(birthYear({ ...draft, day: '29' }, january)).toBe(1980);
    expect(slotError('day', '29', draft, january)).toBe('');
    expect(slotError('day', '29', { ...draft, yearBeforeAge: 1979 }, today)).toBe('出生日须为 1–28');
  });
  it('validates leap day against the adjusted birth year', () => {
    expect(slotError('day', '29', { ...age, month: '02' }, { ...today, month: 1 })).toBe('出生日须为 1–28');
    expect(slotError('day', '29', { ...age, month: '02' }, today)).toBe('');
  });
});
