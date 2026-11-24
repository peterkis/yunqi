import { fillBirthDate } from '../../../../test/birth-input';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createBirthComparisonDto, createClientStub } from '../../../../test/learning-fixtures';
import { createTestWrapper } from '../../../../test/test-utils';
import { AppRoutes } from '../../../../app/AppRoutes';

describe('BirthComparisonPage', () => {
  it('rejects an invalid day and blocks both preview and submission', async () => {
    const user = userEvent.setup();
    const client = createClientStub({ compareBirth: vi.fn().mockRejectedValue(new Error('invalid calendar date: private details')) });
    render(<AppRoutes />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    await fillBirthDate('1980-02-31');
    expect(document.querySelectorAll('input[type="date"], input[type="radio"]')).toHaveLength(0);
    expect(screen.getByRole('textbox', { name: '日' })).toHaveValue('');
    expect(await screen.findByText('出生日须为 1–29')).toBeVisible();
    expect(screen.getByRole('button', { name: '确认并对照' })).toBeDisabled();
    expect(client.compareBirth).not.toHaveBeenCalled();
    expect(screen.queryByText(/private details/)).not.toBeInTheDocument();
  });

  it('clears incomplete segmented input and restores year focus without retaining a draft', async () => {
    const user = userEvent.setup();
    render(<AppRoutes />, { wrapper: createTestWrapper(createClientStub(), '/yunqi/birth') });
    await user.click(screen.getByRole('radio', { name: '按出生年份' }));
    await user.type(screen.getByRole('textbox', { name: '年' }), '198');
    await user.click(screen.getByRole('button', { name: '清空本次资料' }));
    expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: '年' })).toHaveFocus();
    await user.type(screen.getByRole('textbox', { name: '年' }), '20');
    await user.click(screen.getByRole('button', { name: '清空本次资料' }));
    expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: '年' })).toHaveFocus();
  });

  it('submits a date without inventing a time, compares beside current and removes edited results', async () => {
    const user = userEvent.setup();
    const client = createClientStub();
    render(<AppRoutes />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    expect(client.compareBirth).not.toHaveBeenCalled();
    expect(client.getLearningCurrent).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('出生时刻', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '仅按年份对照' })).toBeDisabled();
    expect(within(screen.getByRole('form', { name: '出生运气输入' })).getByRole('button', { name: '仅按年份对照' })).toHaveClass('ds-button--primary');
    await fillBirthDate('1990-05-12');
    await user.click(screen.getByRole('button', { name: '确认并对照' }));
    const result = await screen.findByRole('region', { name: '出生与当前运气对照结果' });
    expect(result).not.toHaveTextContent(/动效|frame-in-flight|no-view-transition/);
    const technical = screen.getByText('计算说明与版本').closest('details')!;
    await user.click(within(technical).getByText('计算说明与版本'));
    expect(technical).not.toHaveTextContent(/动效|frame-in-flight|no-view-transition/);
    const summary = screen.getByRole('group', { name: '出生资料摘要' });
    expect(summary).toHaveTextContent('1990-05-12 · 时刻不详 · 修改');
    expect(screen.queryByRole('form', { name: '出生运气输入' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '同时测评体质' })).toHaveClass('ds-button--primary');
    expect(screen.getByRole('button', { name: '同时测评体质' }).closest('.panel-shell__actions')).not.toBeNull();
    expect(document.querySelectorAll('.ds-button--primary')).toHaveLength(1);
    expect(client.compareBirth).toHaveBeenCalledExactlyOnceWith({ birthDate: '1990-05-12' });
    const table = within(result).getByRole('table', { name: '出生运气 · 先天与当下并列对照' });
    expect(within(table).getByRole('columnheader', { name: /^先天/ })).toBeVisible();
    expect(within(table).getByRole('columnheader', { name: '关系' })).toBeVisible();
    expect(within(table).getByRole('columnheader', { name: /^当下/ })).toBeVisible();
    for (const name of ['岁运', '司天', '在泉', '所处气', '所处运']) expect(within(table).getByRole('rowheader', { name })).toHaveAttribute('scope', 'row');
    expect(result.querySelector('.birth-candidate-interval')).toBeNull();
    expect(within(result).getByText('当日无交界 · 归属唯一')).toBeVisible();
    const { current, candidates } = createBirthComparisonDto();
    expect(result.querySelector('.birth-time-anchors')).toHaveTextContent(`先天 ${candidates[0].learning.facts.year} · 当下 ${current.facts.year}`);
    expect(result.querySelector('.birth-time-anchors time')).toHaveAttribute('datetime', current.facts.input.localTime);
    expect(table.querySelector('time, .num')).toBeNull();
    expect(within(result).getByText('出生时令结构不等于体质，原文病候是文献线索而非发病预测。请与体质量表、四诊互参。')).toBeVisible();
    await user.click(within(summary).getByRole('button', { name: '修改' }));
    await user.click(screen.getByRole('button', { name: '关闭修改' }));
    expect(screen.queryByRole('form', { name: '出生运气输入' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: '出生与当前运气对照结果' })).toBeVisible();
    expect(client.compareBirth).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: '修改' }));
    const year = screen.getByRole<HTMLInputElement>('textbox', { name: '年' });
    expect(year).toHaveFocus();
    expect(year).toHaveValue('1990');
    expect([year.selectionStart, year.selectionEnd]).toEqual([0, 4]);
    expect(screen.queryByRole('button', { name: '同时测评体质' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '月' })).toHaveValue('05');
    expect(screen.getByRole('textbox', { name: '日' })).toHaveValue('12');
    expect(await screen.findByText('公历 1990-05-12')).toBeVisible();
    expect(screen.queryByRole('button', { name: /补录时刻/ })).not.toBeInTheDocument();
    expect(result.closest('[inert]')).not.toBeNull();
    await fillBirthDate('1990-05-13');
    expect(screen.queryByRole('region', { name: '出生与当前运气对照结果' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '清空输入' }));
    expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('已清空输入');
  });

  it('cancels a failed replacement and restores the committed draft and result', async () => {
    const user = userEvent.setup();
    const client = createClientStub({ compareBirth: vi.fn().mockResolvedValueOnce(createBirthComparisonDto()).mockRejectedValueOnce(new Error('private')) });
    render(<AppRoutes />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    await fillBirthDate('1990-05-12');
    await user.click(screen.getByRole('button', { name: '确认并对照' }));
    await user.click(await screen.findByRole('button', { name: '修改' }));
    await fillBirthDate('1991-06-13');
    await user.click(screen.getByRole('button', { name: '确认并对照' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('无法完成对照');
    await user.keyboard('{Escape}');
    expect(screen.getByRole('group', { name: '出生资料摘要' })).toHaveTextContent('1990-05-12');
    expect(screen.getByRole('button', { name: '修改' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: '修改' }));
    expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('1990');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('normalizes a known minute, blocks duplicate submission and retains explicit exact-time semantics', async () => {
    const user = userEvent.setup();
    let resolve!: (value: ReturnType<typeof createBirthComparisonDto>) => void;
    const response = { ...createBirthComparisonDto(), birthPrecision: 'time' as const };
    const client = createClientStub({ compareBirth: vi.fn(() => new Promise<ReturnType<typeof createBirthComparisonDto>>((done) => { resolve = done; })) });
    render(<AppRoutes />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    await fillBirthDate('1990-03-21');
    await user.click(screen.getByRole('button', { name: /补录时刻/ }));
    fireEvent.change(screen.getByLabelText('出生时刻', { exact: true }), { target: { value: '09:30' } });
    await user.click(screen.getByRole('button', { name: '确认并对照' }));
    expect(screen.getByRole('textbox', { name: '年' })).toBeDisabled();
    expect(screen.getByLabelText('出生时刻', { exact: true })).toBeDisabled();
    expect(screen.getByRole('button', { name: '清空本次资料' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '正在对照…' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: '出生运气输入' }));
    expect(client.compareBirth).toHaveBeenCalledExactlyOnceWith({ birthDate: '1990-03-21', birthTime: '09:30:00' });
    await act(async () => { resolve(response); });
    await screen.findByRole('region', { name: '出生与当前运气对照结果' });
    expect(screen.getByRole('group', { name: '出生资料摘要' })).toHaveTextContent('1990-03-21 · 09:30 · 修改');
    expect(screen.getByText('时刻已知 · 归属唯一')).toBeVisible();
    expect(document.querySelector('.birth-candidate-interval')).toBeNull();
    await user.click(screen.getByRole('button', { name: '清空本次资料' }));
    expect(screen.queryByRole('button', { name: /补录时刻/ })).not.toBeInTheDocument();
    expect(screen.getByRole('form', { name: '出生运气输入' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('');
    expect(screen.queryByRole('group', { name: '出生资料摘要' })).not.toBeInTheDocument();
  });

  it('shows each boundary-day candidate and keeps service errors sanitized', async () => {
    const user = userEvent.setup();
    const original = createBirthComparisonDto();
    const response = { ...original, ambiguous: true, message: '该日跨过交节，出生时刻不详，请分别核对。', candidates: [original.candidates[0], { ...original.candidates[0], label: '交节后可能结果' }] };
    const client = createClientStub({ compareBirth: vi.fn().mockRejectedValueOnce(new Error('private backend detail')).mockResolvedValueOnce(response) });
    render(<AppRoutes />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    expect(screen.getByRole('button', { name: '仅按年份对照' })).toBeDisabled();
    expect(client.compareBirth).not.toHaveBeenCalled();
    await fillBirthDate('1990-05-12');
    await user.click(screen.getByRole('button', { name: '确认并对照' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('无法完成对照');
    expect(screen.queryByText(/private backend/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认并对照' }));
    expect(await screen.findByText(response.message)).toHaveClass('birth-api-message');
    expect(within(screen.getByRole('article', { name: '交节后可能结果' })).getByRole('heading', { name: '交节后可能结果', level: 3 })).toBeVisible();
    expect(screen.queryByText('当日无交界 · 归属唯一')).not.toBeInTheDocument();
    expect(document.querySelectorAll('.birth-candidate-interval')).toHaveLength(2);
    expect(screen.getAllByRole('table')).toHaveLength(2);
    for (const table of screen.getAllByRole('table')) expect(within(table).getAllByRole('rowheader')).toHaveLength(5);
  });

  it('requires the selected known time and preserves supplied seconds', async () => {
    const user = userEvent.setup();
    const client = createClientStub();
    render(<AppRoutes />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    await fillBirthDate('1990-03-21');
    await user.click(screen.getByRole('button', { name: /补录时刻/ }));
    expect(screen.getByRole('button', { name: '确认并对照' })).toBeDisabled();
    expect(client.compareBirth).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('出生时刻', { exact: true }), { target: { value: '09:30:21' } });
    await user.click(screen.getByRole('button', { name: '确认并对照' }));
    await screen.findByRole('region', { name: '出生与当前运气对照结果' });
    expect(client.compareBirth).toHaveBeenCalledExactlyOnceWith({ birthDate: '1990-03-21', birthTime: '09:30:21' });
  });

  it('shows API relations beside every row and exposes their explanations and sources on demand', async () => {
    const user = userEvent.setup();
    const dto = createBirthComparisonDto();
    const candidate = dto.candidates[0];
    const titles = ['中运对照', '司天对照', '在泉对照', '客气对照', '客运对照'];
    const labels = ['出生生当前', '当前生出生', '出生克当前', '当前克出生', '同五行'];
    const comparisons = titles.map((title, index) => ({ ...candidate.comparisons[0], title, label: labels[index], relation: `${title}的API方向`, explanation: `${title}的API释义` }));
    const client = createClientStub({ compareBirth: vi.fn().mockResolvedValue({ ...dto, candidates: [{ ...candidate, comparisons }] }) });
    render(<AppRoutes />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    await fillBirthDate('1990-05-12');
    await user.click(screen.getByRole('button', { name: '确认并对照' }));
    const table = await screen.findByRole('table');
    const tones = ['favorable', 'favorable', 'adverse', 'adverse', 'neutral'];
    for (const [index, row] of [...table.querySelectorAll<HTMLElement>('tbody tr')].entries()) {
      const chip = within(row).getByText(labels[index], { exact: true });
      expect(chip).toBeVisible();
      expect(chip).toHaveClass(`ds-relation__chip--${tones[index]}`);
      expect(within(row).getByText(`${titles[index]}的API方向`, { exact: true })).toHaveClass('visually-hidden');
      expect(row.querySelector('.ds-relation__explanation')).toBeNull();
    }
    const toggle = screen.getByRole('button', { name: '这些关系怎么读？' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    const disclosure = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const matrix = within(disclosure).getByRole('table', { name: '五维生克总览' });
    expect(within(matrix).getAllByRole('rowheader')).toHaveLength(5);
    for (const text of ['2项相克', '2项相生', '1项同五行']) expect(within(disclosure).getByText(text)).toBeVisible();
    const directions = ['出生 → 当前', '当前 → 出生', '出生 → 当前', '当前 → 出生', '无方向'];
    for (const [index, row] of [...matrix.querySelectorAll<HTMLTableRowElement>('tbody tr')].entries()) {
      expect(row.cells[1]).toHaveTextContent(directions[index]);
      expect(within(row).getByText(labels[index])).toHaveAttribute('data-tone', index === 3 ? 'incoming-control' : tones[index]);
      expect(within(disclosure).getByText(`${titles[index]}的API释义`, { exact: false })).toBeVisible();
    }
    expect(within(disclosure).queryByRole('link')).not.toBeInTheDocument();
    expect(within(disclosure).getAllByText('《传统理论测试来源》')).toHaveLength(1);
    expect(within(disclosure).getByTitle('《传统理论测试来源》')).toHaveClass('learning-source');
    expect(disclosure.querySelector('.learning-source svg')).toBeNull();
  });

  it('blocks two submits in the same event turn and permits another comparison after settlement', async () => {
    let resolve!: (value: ReturnType<typeof createBirthComparisonDto>) => void;
    const client = createClientStub({ compareBirth: vi.fn(() => new Promise<ReturnType<typeof createBirthComparisonDto>>((done) => { resolve = done; })) });
    render(<AppRoutes />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    await fillBirthDate('1990-05-12');
    const form = screen.getByRole('form', { name: '出生运气输入' });
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await waitFor(() => expect(client.compareBirth).toHaveBeenCalledOnce());
    await act(async () => { resolve(createBirthComparisonDto()); });
    await screen.findByRole('table');
    await userEvent.setup().click(screen.getByRole('button', { name: '修改' }));
    await fillBirthDate('1991-06-13');
    await waitFor(() => expect(screen.getByRole('button', { name: '确认并对照' })).toBeEnabled());
    fireEvent.submit(screen.getByRole('form', { name: '出生运气输入' }));
    await waitFor(() => expect(client.compareBirth).toHaveBeenCalledTimes(2));
    await act(async () => { resolve(createBirthComparisonDto()); });
  });
});
