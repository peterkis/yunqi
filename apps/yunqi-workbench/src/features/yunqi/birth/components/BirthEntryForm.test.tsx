import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BirthDatePreviewDto } from '@yunqi/contracts';
import { createClientStub } from '../../../../test/learning-fixtures';
import { createTestWrapper } from '../../../../test/test-utils';
import { createYunQiCalculationDto } from '../../../../test/yunqi-fixtures';
import { emptyBirthDraft, type BirthDraft } from '../presentation/birth-entry';
import { BirthEntryForm } from './BirthEntryForm';

function setup(client = createClientStub(), initial = emptyBirthDraft) {
  const confirm = vi.fn();
  function Form() {
    const [draft, setDraft] = useState<BirthDraft>(initial);
    return <BirthEntryForm draft={draft} onEdit={setDraft} cleared={false}
      onClear={() => setDraft(emptyBirthDraft)} onConfirm={confirm} pending={false} />;
  }
  render(<Form />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
  return { confirm, user: userEvent.setup() };
}
const slot = (name: string) => screen.getByRole('textbox', { name });
const key = (name: string) => screen.getByRole('button', { name });
const match = (birthDate: string, lunarLabel = '') => ({ birthDate, lunarLabel, leap: false, annualLabels: ['年度信息'], boundaries: [] });
const dateReference = (date: string) => {
  const current = createYunQiCalculationDto();
  return vi.fn().mockResolvedValue({ ...current, input: { ...current.input, localTime: date + 'T12:00:00+08:00' } });
};
const lunarAgeDraft = { ...emptyBirthDraft, primary: '25', calendar: 'lunar', month: '08', day: '15' } as const;

describe('inline birth entry', () => {
  it('adjusts the solar birth year for an upcoming birthday and uses the same keypad and keyboard slots', async () => {
    const { user, confirm } = setup();
    await user.click(key('4')); await user.click(key('6'));
    expect(slot('月')).toHaveFocus();
    await waitFor(() => expect(key('仅按年份对照')).toBeEnabled());
    const inferred = Number(screen.getByText(/推算 \d{4} 年/).textContent?.match(/\d{4}/)?.[0]);
    await user.keyboard('{Enter}');
    expect(confirm).toHaveBeenCalledWith({ year: inferred });
    await user.click(key('3'));
    expect(slot('月')).toHaveValue('03'); expect(slot('日')).toHaveFocus();
    await user.keyboard('{Backspace}');
    expect(slot('月')).toHaveFocus(); expect(slot('月')).toHaveValue('');
    await user.click(screen.getByRole('radio', { name: '按出生年份' }));
    expect(slot('年')).toHaveValue(String(inferred));
    await user.click(screen.getByRole('radio', { name: '按年龄推算' }));
    expect(slot('年龄')).toHaveValue('46');
    fireEvent.change(slot('月'), { target: { value: '12' } });
    await user.click(key('仅按年份对照')); expect(confirm).toHaveBeenLastCalledWith({ year: inferred - 1 });
    await user.type(slot('日'), '15');
    await waitFor(() => expect(key('确认并对照')).toBeEnabled());
    await user.click(key('确认并对照'));
    expect(confirm).toHaveBeenLastCalledWith({ birthDate: (inferred - 1) + '-12-15' });
    await user.click(screen.getByRole('radio', { name: '农历' }));
    expect(screen.queryByText(`推算公历 ${inferred} 年`)).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('uses the day to correct only when the reported month is the reference month', async () => {
    const { user } = setup();
    await user.type(slot('年龄'), '46'); await user.type(slot('月'), '06');
    await screen.findByText('推算 1980 年');
    await user.type(slot('日'), '20');
    expect(screen.getByText('按日修正 1979 年')).toBeVisible();
    await user.click(screen.getByRole('radio', { name: '按出生年份' }));
    expect(slot('年')).toHaveValue('1979');
    await user.click(screen.getByRole('radio', { name: '按年龄推算' }));
    expect(slot('年龄')).toHaveValue('46');
    fireEvent.change(slot('日'), { target: { value: '19' } });
    expect(screen.getByText('推算 1980 年')).toBeVisible();
    await waitFor(() => expect(key('确认并对照')).toBeEnabled());
    expect(screen.queryByRole('button', { name: /补录时刻/ })).not.toBeInTheDocument();
  });
  it('accepts ages 0 through 120 and retains the reported date after a correction', async () => {
    const { user } = setup();
    await user.type(slot('年龄'), '12'); expect(slot('年龄')).toHaveFocus();
    await user.keyboard('0'); expect(slot('年龄')).toHaveValue('120'); expect(slot('月')).toHaveFocus();
    await user.click(key('清空本次资料')); await user.type(slot('年龄'), '0');
    await waitFor(() => expect(key('仅按年份对照')).toBeEnabled());
    fireEvent.paste(slot('年龄'), { clipboardData: { getData: () => '1980-01-31' } });
    expect(slot('年')).toHaveValue('1980');
    fireEvent.change(slot('月'), { target: { value: '02' } });
    expect(slot('日')).toHaveValue('31'); expect(slot('日')).toHaveAttribute('aria-invalid','true');
    expect(key('确认并对照')).toBeDisabled();
    await user.click(slot('日')); await user.keyboard('{ArrowLeft}'); expect(slot('月')).toHaveFocus();
    await user.keyboard('{ArrowRight}'); expect(slot('日')).toHaveFocus();
  });
  it('rejects impossible field values and pasted dates before changing the draft', async () => {
    const { user, confirm } = setup();
    await user.click(screen.getByRole('radio', { name: '按出生年份' }));
    fireEvent.change(slot('年'), { target: { value: '1899' } });
    expect(slot('年')).toHaveValue('');
    fireEvent.change(slot('年'), { target: { value: '1980' } });
    for (const value of ['00', '13', '-1']) {
      fireEvent.change(slot('月'), { target: { value } });
      expect(slot('月')).toHaveValue('');
      expect(slot('月')).toHaveAttribute('aria-invalid', 'true');
      expect(document.querySelector('.birth-entry__preview')).toHaveAttribute('data-tone', 'error');
    }
    await user.click(slot('月')); await user.keyboard('0');
    expect(slot('月')).toHaveValue('');
    expect(document.querySelector('.birth-entry__preview')).toHaveAttribute('data-tone', 'normal');
    await user.keyboard('2');
    expect(slot('月')).toHaveValue('02'); expect(slot('日')).toHaveFocus();
    for (const value of ['00', '30', '32']) {
      fireEvent.change(slot('日'), { target: { value } });
      expect(slot('日')).toHaveValue('');
    }
    await user.click(key('2')); await user.click(key('9'));
    expect(slot('日')).toHaveValue('29');
    fireEvent.paste(slot('年'), { clipboardData: { getData: () => '1981-02-29' } });
    expect(slot('年')).toHaveValue('1980'); expect(slot('日')).toHaveValue('29');
    expect(key('确认并对照')).toBeDisabled(); expect(confirm).not.toHaveBeenCalled();
    expect(key('退格').querySelector('svg.lucide-delete')).not.toBeNull();
  });
  it('does not carry a known birth time to another pasted boundary date', async () => {
    const { user, confirm } = setup(createClientStub(), {
      ...emptyBirthDraft, mode: 'year', primary: '1980', month: '03', day: '21',
    });
    await user.click(await screen.findByRole('button', { name: /补录时刻/ }));
    fireEvent.change(screen.getByLabelText('出生时刻'), { target: { value: '09:30' } });
    fireEvent.paste(slot('年'), { clipboardData: { getData: () => '1981-03-21' } });
    await screen.findByText('公历 1981-03-21');
    expect(screen.queryByLabelText('出生时刻')).not.toBeInTheDocument();
    await user.click(key('确认并对照'));
    expect(confirm).toHaveBeenCalledExactlyOnceWith({ birthDate: '1981-03-21' });
  });
  it('keeps February 3 confirmable when any appended digit is rejected', async () => {
    const { user, confirm } = setup();
    await user.type(slot('年龄'), '52');
    await user.keyboard('23');
    const submit = key('确认并对照');
    await waitFor(() => expect(submit).toBeEnabled());
    for (const digit of '0123456789') {
      await user.click(key(digit));
      expect(slot('日')).toHaveValue('3');
      expect(slot('日')).not.toHaveAttribute('aria-invalid', 'true');
      expect(submit).toBeEnabled();
    }
    expect(screen.getByText('出生日须为 1–28。')).toBeVisible();
    expect(screen.getByText('公历 1974-02-03')).toBeVisible();
    expect(confirm).not.toHaveBeenCalled();
    await user.click(submit);
    expect(confirm).toHaveBeenCalledExactlyOnceWith({ birthDate: '1974-02-03' });
  });

  it('discards late previews, requires a selection for multiple dates and can fall back to year only', async () => {
    let finish!: (data: BirthDatePreviewDto) => void;
    const client = createClientStub({ previewBirthDate: vi.fn()
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValueOnce({ matches: [match('1980-01-01','十一月十四'), match('1980-12-20','十一月十四')] }) });
    const { user, confirm } = setup(client, { ...emptyBirthDraft, mode: 'year', primary: '1980', calendar: 'lunar', month: '11', day: '13' });
    await waitFor(() => expect(client.previewBirthDate).toHaveBeenCalledTimes(1));
    fireEvent.change(slot('日'), { target: { value: '14' } });
    await screen.findByRole('radio', { name: /1980-12-20/ });
    await act(async () => finish({ matches: [match('1980-12-19')] }));
    expect(screen.queryByText(/1980-12-19/)).not.toBeInTheDocument();
    expect(key('确认并对照')).toBeDisabled();
    await user.click(key('仅按年份对照')); expect(confirm).toHaveBeenLastCalledWith({ year: 1980 });
    await user.click(screen.getByRole('radio', { name: /1980-12-20/ }));
    await user.click(key('确认并对照')); expect(confirm).toHaveBeenLastCalledWith({ birthDate: '1980-12-20' });
  });
  it('waits for both years and uses attained age rather than subtracting it from the current year', async () => {
    let finishLatest!: (data: BirthDatePreviewDto) => void;
    const client = createClientStub({
      getCurrent: dateReference('2026-01-01'),
      previewBirthDate: vi.fn(({ year }) => year === 2000
        ? Promise.resolve({ matches: [match('2000-09-12', '八月十五')] })
        : new Promise<BirthDatePreviewDto>(resolve => { finishLatest = resolve; })),
    });
    const { confirm, user } = setup(client, lunarAgeDraft);
    await waitFor(() => expect(client.previewBirthDate).toHaveBeenCalledTimes(2));
    expect(vi.mocked(client.previewBirthDate).mock.calls.map(([request]) => request)).toEqual([
      { year: 2000, calendar: 'lunar', month: 8, day: 15 },
      { year: 2001, calendar: 'lunar', month: 8, day: 15 },
    ]);
    expect(key('确认并对照')).toBeDisabled();
    expect(screen.queryByText(/2000-09-12/)).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(confirm).not.toHaveBeenCalled();
    await act(async () => finishLatest({ matches: [match('2001-10-01', '八月十五')] }));
    expect(confirm).toHaveBeenCalledExactlyOnceWith({ birthDate: '2000-09-12' });
    expect(screen.getByText(/八月十五 · 2000-09-12/)).toBeVisible();
    expect(screen.queryByText(/2001-10-01/)).not.toBeInTheDocument();
  });
  it('requires explicit selection for multiple exact-age dates across years and includes birthdays occurring today', async () => {
    const client = createClientStub({
      getCurrent: dateReference('2026-09-21'),
      previewBirthDate: vi.fn(async ({ year }) => ({ matches: year === 2001
        ? [match('2001-10-01', '八月十五')] : [match('2002-09-21', '八月十五')] })),
    });
    const { user, confirm } = setup(client, { ...lunarAgeDraft, primary: '24' });
    const earlier = await screen.findByRole('radio', { name: /八月十五 · 2001-10-01/ });
    expect(screen.getByRole('radio', { name: /八月十五 · 2002-09-21/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: '仅按年份对照' })).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(key('确认并对照')).toBeDisabled();
    expect(confirm).not.toHaveBeenCalled();
    await user.click(earlier);
    await user.click(key('确认并对照'));
    expect(confirm).toHaveBeenCalledExactlyOnceWith({ birthDate: '2001-10-01' });
  });
  it('keeps both regular and leap month matches that fit the entered age', async () => {
    const client = createClientStub({
      getCurrent: dateReference('2026-06-19'),
      previewBirthDate: vi.fn(async ({ year }) => ({ matches: year === 2023
        ? [match('2023-02-20', '二月初一'), { ...match('2023-03-22', '闰二月初一'), leap: true }]
        : [match('2022-03-03', '二月初一')] })),
    });
    const { user, confirm } = setup(client, { ...lunarAgeDraft, primary: '3', month: '02', day: '01' });
    const leap = await screen.findByRole('radio', { name: /闰二月初一 · 2023-03-22/ });
    expect(screen.getByRole('radio', { name: /^二月初一 · 2023-02-20$/ })).toBeVisible();
    expect(screen.queryByRole('radio', { name: /2022-03-03/ })).not.toBeInTheDocument();
    await user.click(leap);
    await user.click(key('确认并对照'));
    expect(confirm).toHaveBeenCalledExactlyOnceWith({ birthDate: '2023-03-22' });
  });
  it('never submits from a partial result when either year fails and explains no exact-age matches after retry', async () => {
    const client = createClientStub({
      getCurrent: dateReference('2026-01-01'),
      previewBirthDate: vi.fn()
        .mockResolvedValueOnce({ matches: [match('2000-09-12', '八月十五')] })
        .mockRejectedValueOnce(new Error('private'))
        .mockResolvedValueOnce({ matches: [] })
        .mockResolvedValueOnce({ matches: [match('2001-10-01', '八月十五')] }),
    });
    const { user, confirm } = setup(client, lunarAgeDraft);
    const retry = await screen.findByRole('button', { name: /日期预览失败/ });
    expect(key('确认并对照')).toBeDisabled();
    expect(screen.queryByText(/2000-09-12|private/)).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(confirm).not.toHaveBeenCalled();
    await user.click(retry);
    expect(key('确认并对照')).toBeDisabled();
    await screen.findByText(/未找到符合所填周岁/);
    expect(key('确认并对照')).toBeDisabled();
    expect(client.previewBirthDate).toHaveBeenCalledTimes(4);
    expect(confirm).not.toHaveBeenCalled();
  });
  it('honors one Enter pressed while a valid date is still being resolved', async () => {
    let finish!: (data: BirthDatePreviewDto) => void;
    const client = createClientStub({ previewBirthDate: vi.fn(() => new Promise<BirthDatePreviewDto>(resolve => { finish = resolve; })) });
    const { confirm, user } = setup(client, { ...emptyBirthDraft, mode: 'year', primary: '1980', month: '03', day: '12' });
    await waitFor(() => expect(client.previewBirthDate).toHaveBeenCalledOnce());
    await user.keyboard('{Enter}{Enter}');
    expect(confirm).not.toHaveBeenCalled();
    await act(async () => finish({ matches: [match('1980-03-12')] }));
    expect(confirm).toHaveBeenCalledExactlyOnceWith({ birthDate: '1980-03-12' });
  });
  it('recovers a failed preview without exposing backend details', async () => {
    const client = createClientStub({ previewBirthDate: vi.fn().mockRejectedValueOnce(new Error('private'))
      .mockResolvedValueOnce({ matches: [] }) });
    const { user } = setup(client, { ...emptyBirthDraft, mode: 'year', primary: '1980', calendar: 'lunar', month: '11', day: '30' });
    await user.click(await screen.findByRole('button', { name: /日期预览失败/ }));
    await screen.findByText(/未找到可计算日期/);
    expect(key('确认并对照')).toBeDisabled(); expect(screen.queryByText(/private/)).not.toBeInTheDocument();
  });
});
