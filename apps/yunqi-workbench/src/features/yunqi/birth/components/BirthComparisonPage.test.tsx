import { fillBirthDate } from '../../../../test/birth-input';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createBirthComparisonDto, createClientStub } from '../../../../test/learning-fixtures';
import { createTestWrapper } from '../../../../test/test-utils';
import { BirthComparisonPage } from './BirthComparisonPage';

describe('BirthComparisonPage', () => {
  it('leaves month-day validity to the API and presents its sanitized error through the existing path', async () => {
    const user = userEvent.setup();
    const client = createClientStub({ compareBirth: vi.fn().mockRejectedValue(new Error('invalid calendar date: private details')) });
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    fillBirthDate('1980-02-31');
    expect(document.querySelectorAll('input[type="date"], input[type="radio"]')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: '查看对照' }));
    expect(client.compareBirth).toHaveBeenCalledExactlyOnceWith({ birthDate: '1980-02-31' });
    expect(await screen.findByRole('alert')).toHaveTextContent('无法完成对照，请核对出生日期、支持范围和网络后重试。');
    expect(screen.queryByText(/private details/)).not.toBeInTheDocument();
  });

  it('clears incomplete segmented input and restores year focus without retaining a draft', async () => {
    const user = userEvent.setup();
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(createClientStub(), '/yunqi/birth') });
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
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    expect(client.compareBirth).not.toHaveBeenCalled();
    expect(client.getLearningCurrent).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('出生时刻（北京时间）')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看对照' })).toHaveClass('ds-button--primary');
    expect(screen.getByRole('button', { name: '查看对照' })).toHaveAttribute('form', screen.getByRole('form', { name: '出生运气输入' }).id);
    expect(screen.getByRole('button', { name: '查看对照' }).closest('.panel-shell__actions')).not.toBeNull();
    fillBirthDate('1990-05-12');
    await user.click(screen.getByRole('button', { name: '查看对照' }));
    const result = await screen.findByRole('region', { name: '出生与当前运气对照结果' });
    const summary = screen.getByRole('group', { name: '出生资料摘要' });
    expect(summary).toHaveTextContent('1990-05-12 · 时刻不详 · 修改');
    expect(screen.queryByRole('form', { name: '出生运气输入' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '同时测评体质' })).toHaveClass('ds-button--primary');
    expect(screen.getByRole('button', { name: '同时测评体质' }).closest('.panel-shell__actions')).not.toBeNull();
    expect(document.querySelectorAll('.ds-button--primary')).toHaveLength(1);
    expect(client.compareBirth).toHaveBeenCalledExactlyOnceWith({ birthDate: '1990-05-12' });
    const table = within(result).getByRole('table', { name: '出生运气 · 先天与当下并列对照' });
    expect(within(table).getByRole('columnheader', { name: /先天\u202f·\u202f出生/ })).toBeVisible();
    expect(within(table).getByRole('columnheader', { name: /当下\u202f·\u202f今日/ })).toBeVisible();
    expect(within(table).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual(['岁运', '司天', '在泉', '所处气', '所处运']);
    expect(result.querySelector('.birth-candidate-interval')).toBeNull();
    expect(within(result).getByText('当日无交界 · 归属唯一')).toBeVisible();
    expect(result.querySelector('.birth-table__time time')).toHaveAttribute('datetime', createBirthComparisonDto().current.facts.input.localTime);
    expect(result.querySelector('.birth-table__time time')).toHaveTextContent('06-19 12:00');
    expect(result.querySelector('.birth-current-time')).toBeNull();
    expect(within(result).getByText('出生时令结构不等于体质，原文病候是文献线索而非发病预测。请与体质量表、四诊互参。')).toBeVisible();
    await user.click(within(summary).getByRole('button', { name: '修改' }));
    expect(screen.getByRole('textbox', { name: '年' })).toHaveFocus();
    expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('1990');
    expect(screen.queryByRole('button', { name: '同时测评体质' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看对照' }).closest('.panel-shell__actions')).not.toBeNull();
    expect(result).toBeVisible();
    await user.click(screen.getByRole('radio', { name: '时刻不详' }));
    expect(result).toBeVisible();
    fillBirthDate('1990-05-13');
    expect(screen.queryByRole('region', { name: '出生与当前运气对照结果' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('资料已修改');
    await user.click(screen.getByRole('button', { name: '清空本次资料' }));
    expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('normalizes a known minute, blocks duplicate submission and retains explicit exact-time semantics', async () => {
    const user = userEvent.setup();
    let resolve!: (value: ReturnType<typeof createBirthComparisonDto>) => void;
    const response = { ...createBirthComparisonDto(), birthPrecision: 'time' as const };
    const client = createClientStub({ compareBirth: vi.fn(() => new Promise<ReturnType<typeof createBirthComparisonDto>>((done) => { resolve = done; })) });
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    fillBirthDate('1990-05-12');
    await user.click(screen.getByRole('radio', { name: '已知时刻' }));
    fireEvent.change(screen.getByLabelText('出生时刻（北京时间）'), { target: { value: '09:30' } });
    await user.click(screen.getByRole('button', { name: '查看对照' }));
    expect(screen.getByRole('textbox', { name: '年' })).toBeDisabled();
    expect(screen.getByLabelText('出生时刻（北京时间）')).toBeDisabled();
    expect(screen.getByRole('button', { name: '清空本次资料' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '正在对照…' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: '出生运气输入' }));
    expect(client.compareBirth).toHaveBeenCalledExactlyOnceWith({ birthDate: '1990-05-12', birthTime: '09:30:00' });
    await act(async () => { resolve(response); });
    await screen.findByRole('region', { name: '出生与当前运气对照结果' });
    expect(screen.getByRole('group', { name: '出生资料摘要' })).toHaveTextContent('1990-05-12 · 09:30 · 修改');
    expect(screen.getByText('时刻已知 · 归属唯一')).toBeVisible();
    expect(document.querySelector('.birth-candidate-interval')).toBeNull();
    await user.click(screen.getByRole('button', { name: '清空本次资料' }));
    expect(screen.getByRole('radio', { name: '已知时刻' })).not.toBeChecked();
    expect(screen.getByRole('form', { name: '出生运气输入' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('');
    expect(screen.queryByRole('group', { name: '出生资料摘要' })).not.toBeInTheDocument();
  });

  it('shows each boundary-day candidate and keeps service errors sanitized', async () => {
    const user = userEvent.setup();
    const original = createBirthComparisonDto();
    const response = { ...original, ambiguous: true, message: '该日跨过交节，出生时刻不详，请分别核对。', candidates: [original.candidates[0], { ...original.candidates[0], label: '交节后可能结果' }] };
    const client = createClientStub({ compareBirth: vi.fn().mockRejectedValueOnce(new Error('private backend detail')).mockResolvedValueOnce(response) });
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    await user.click(screen.getByRole('button', { name: '查看对照' }));
    expect(screen.getByRole('alert')).toHaveTextContent('请填写有效的出生日期');
    expect(client.compareBirth).not.toHaveBeenCalled();
    fillBirthDate('1990-05-12');
    await user.click(screen.getByRole('button', { name: '查看对照' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('无法完成对照');
    expect(screen.queryByText(/private backend/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查看对照' }));
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
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    fillBirthDate('1990-05-12');
    await user.click(screen.getByRole('radio', { name: '已知时刻' }));
    await user.click(screen.getByRole('button', { name: '查看对照' }));
    expect(screen.getByRole('alert')).toBeVisible();
    expect(client.compareBirth).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('出生时刻（北京时间）'), { target: { value: '09:30:21' } });
    await user.click(screen.getByRole('button', { name: '查看对照' }));
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
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    fillBirthDate('1990-05-12');
    await user.click(screen.getByRole('button', { name: '查看对照' }));
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
    expect(disclosure.querySelector('ul, li')).toBeNull();
    for (const source of within(disclosure).getAllByRole('link')) {
      expect(source).toHaveClass('learning-source');
      expect(source).toHaveAccessibleName('《传统理论测试来源》，新窗口打开');
      expect(source.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      expect(source).not.toHaveTextContent('新窗口');
    }
  });

  it('blocks two submits in the same event turn and permits another comparison after settlement', async () => {
    let resolve!: (value: ReturnType<typeof createBirthComparisonDto>) => void;
    const client = createClientStub({ compareBirth: vi.fn(() => new Promise<ReturnType<typeof createBirthComparisonDto>>((done) => { resolve = done; })) });
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    fillBirthDate('1990-05-12');
    const form = screen.getByRole('form', { name: '出生运气输入' });
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await waitFor(() => expect(client.compareBirth).toHaveBeenCalledOnce());
    await act(async () => { resolve(createBirthComparisonDto()); });
    await screen.findByRole('table');
    await userEvent.setup().click(screen.getByRole('button', { name: '修改' }));
    fireEvent.submit(screen.getByRole('form', { name: '出生运气输入' }));
    await waitFor(() => expect(client.compareBirth).toHaveBeenCalledTimes(2));
    await act(async () => { resolve(createBirthComparisonDto()); });
  });
});
