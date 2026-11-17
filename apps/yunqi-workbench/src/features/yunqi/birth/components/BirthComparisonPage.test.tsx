import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createBirthComparisonDto, createClientStub } from '../../../../test/learning-fixtures';
import { createTestWrapper } from '../../../../test/test-utils';
import { BirthComparisonPage } from './BirthComparisonPage';

describe('BirthComparisonPage', () => {
  it('submits a date without inventing a time, compares beside current and removes edited results', async () => {
    const user = userEvent.setup();
    const client = createClientStub();
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(client) });
    expect(client.compareBirth).not.toHaveBeenCalled();
    expect(client.getLearningCurrent).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('出生时刻（北京时间）')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('出生日期（公历）'), { target: { value: '1990-05-12' } });
    await user.click(screen.getByRole('button', { name: '查看出生与当前运气' }));
    const result = await screen.findByRole('region', { name: '出生与当前运气对照结果' });
    expect(client.compareBirth).toHaveBeenCalledExactlyOnceWith({ birthDate: '1990-05-12' });
    const table = within(result).getByRole('table', { name: '出生运气 · 先天与当下并列对照' });
    expect(within(table).getByRole('columnheader', { name: /先天 · 出生/ })).toBeVisible();
    expect(within(table).getByRole('columnheader', { name: /当下 · 今日/ })).toBeVisible();
    expect(within(table).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual(['岁运', '司天', '在泉', '所处气', '所处运']);
    expect(within(result).getByText(/可能出生区间/)).toBeVisible();
    expect(within(result).getByText(createBirthComparisonDto().message)).toBeVisible();
    expect(result.querySelector('.birth-current-time time')).toHaveAttribute('datetime', createBirthComparisonDto().current.facts.input.localTime);
    expect(within(result).getByText('出生时令结构不等于体质，原文病候是文献线索而非发病预测。请与体质量表、四诊互参。')).toBeVisible();
    fireEvent.change(screen.getByLabelText('出生日期（公历）'), { target: { value: '1990-05-13' } });
    expect(screen.queryByRole('region', { name: '出生与当前运气对照结果' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('资料已修改');
    await user.click(screen.getByRole('button', { name: '清空本次资料' }));
    expect(screen.getByLabelText('出生日期（公历）')).toHaveValue('');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('normalizes a known minute, blocks duplicate submission and retains explicit exact-time semantics', async () => {
    const user = userEvent.setup();
    let resolve!: (value: ReturnType<typeof createBirthComparisonDto>) => void;
    const response = { ...createBirthComparisonDto(), birthPrecision: 'time' as const };
    const client = createClientStub({ compareBirth: vi.fn(() => new Promise<ReturnType<typeof createBirthComparisonDto>>((done) => { resolve = done; })) });
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(client) });
    fireEvent.change(screen.getByLabelText('出生日期（公历）'), { target: { value: '1990-05-12' } });
    await user.click(screen.getByLabelText('知道出生时刻'));
    fireEvent.change(screen.getByLabelText('出生时刻（北京时间）'), { target: { value: '09:30' } });
    await user.click(screen.getByRole('button', { name: '查看出生与当前运气' }));
    expect(screen.getByLabelText('出生日期（公历）')).toBeDisabled();
    expect(screen.getByLabelText('出生时刻（北京时间）')).toBeDisabled();
    expect(screen.getByRole('button', { name: '清空本次资料' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: '出生运气输入' }));
    expect(client.compareBirth).toHaveBeenCalledExactlyOnceWith({ birthDate: '1990-05-12', birthTime: '09:30:00' });
    await act(async () => { resolve(response); });
    await screen.findByRole('region', { name: '出生与当前运气对照结果' });
    expect(screen.queryByText(/可能出生区间/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '清空本次资料' }));
    expect(screen.getByLabelText('知道出生时刻')).not.toBeChecked();
  });

  it('shows each boundary-day candidate and keeps service errors sanitized', async () => {
    const user = userEvent.setup();
    const original = createBirthComparisonDto();
    const response = { ...original, ambiguous: true, message: '该日跨过交节，出生时刻不详，请分别核对。', candidates: [original.candidates[0], { ...original.candidates[0], label: '交节后可能结果' }] };
    const client = createClientStub({ compareBirth: vi.fn().mockRejectedValueOnce(new Error('private backend detail')).mockResolvedValueOnce(response) });
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(client) });
    await user.click(screen.getByRole('button', { name: '查看出生与当前运气' }));
    expect(screen.getByRole('alert')).toHaveTextContent('请填写有效的出生日期');
    expect(client.compareBirth).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('出生日期（公历）'), { target: { value: '1990-05-12' } });
    await user.click(screen.getByRole('button', { name: '查看出生与当前运气' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('无法完成对照');
    expect(screen.queryByText(/private backend/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查看出生与当前运气' }));
    expect(await screen.findByText(response.message)).toHaveClass('birth-api-message');
    expect(screen.getByRole('heading', { name: '交节后可能结果', level: 3 })).toBeVisible();
    expect(screen.getAllByRole('table')).toHaveLength(2);
    for (const table of screen.getAllByRole('table')) expect(within(table).getAllByRole('rowheader')).toHaveLength(5);
  });

  it('requires the selected known time and preserves supplied seconds', async () => {
    const user = userEvent.setup();
    const client = createClientStub();
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(client) });
    fireEvent.change(screen.getByLabelText('出生日期（公历）'), { target: { value: '1990-05-12' } });
    await user.click(screen.getByLabelText('知道出生时刻'));
    await user.click(screen.getByRole('button', { name: '查看出生与当前运气' }));
    expect(screen.getByRole('alert')).toBeVisible();
    expect(client.compareBirth).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('出生时刻（北京时间）'), { target: { value: '09:30:21' } });
    await user.click(screen.getByRole('button', { name: '查看出生与当前运气' }));
    await screen.findByRole('region', { name: '出生与当前运气对照结果' });
    expect(client.compareBirth).toHaveBeenCalledExactlyOnceWith({ birthDate: '1990-05-12', birthTime: '09:30:21' });
  });

  it('shows API relations beside every row and exposes their explanations and sources on demand', async () => {
    const user = userEvent.setup();
    const dto = createBirthComparisonDto();
    const candidate = dto.candidates[0];
    const titles = ['中运对照', '司天对照', '在泉对照', '客气对照', '客运对照'];
    const labels = ['出生生当前', '当前生出生', '出生克当前', '当前克出生', '同五行'];
    const comparisons = titles.map((title, index) => ({ ...candidate.comparisons[0], title, label: labels[index], relation: `${title}的API方向`, explanation: `${title}的API释义` }));
    const client = createClientStub({ compareBirth: vi.fn().mockResolvedValue({ ...dto, candidates: [{ ...candidate, comparisons }] }) });
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(client) });
    fireEvent.change(screen.getByLabelText('出生日期（公历）'), { target: { value: '1990-05-12' } });
    await user.click(screen.getByRole('button', { name: '查看出生与当前运气' }));
    const table = await screen.findByRole('table');
    for (const [index, row] of [...table.querySelectorAll('tbody')].entries()) {
      expect(within(row).getByText(labels[index], { exact: true })).toBeVisible();
      expect(within(row).getByText(`${titles[index]}的API方向`, { exact: true })).toBeVisible();
    }
    const disclosure = screen.getByText('这些关系怎么读？').closest('details')!;
    expect(disclosure).not.toHaveAttribute('open');
    await user.click(within(disclosure).getByText('这些关系怎么读？'));
    for (const title of titles) expect(within(disclosure).getByText(`${title}的API释义`, { exact: true })).toBeVisible();
    expect(within(disclosure).getAllByRole('link')).toHaveLength(5);
    expect(within(disclosure).getAllByRole('link')[0]).toHaveAttribute('href', candidate.comparisons[0].sources[0].url);
  });

  it('blocks two submits in the same event turn and permits another comparison after settlement', async () => {
    let resolve!: (value: ReturnType<typeof createBirthComparisonDto>) => void;
    const client = createClientStub({ compareBirth: vi.fn(() => new Promise<ReturnType<typeof createBirthComparisonDto>>((done) => { resolve = done; })) });
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(client) });
    fireEvent.change(screen.getByLabelText('出生日期（公历）'), { target: { value: '1990-05-12' } });
    const form = screen.getByRole('form', { name: '出生运气输入' });
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await waitFor(() => expect(client.compareBirth).toHaveBeenCalledOnce());
    await act(async () => { resolve(createBirthComparisonDto()); });
    await screen.findByRole('table');
    fireEvent.submit(form);
    await waitFor(() => expect(client.compareBirth).toHaveBeenCalledTimes(2));
    await act(async () => { resolve(createBirthComparisonDto()); });
  });
});
