import { act, fireEvent, render, screen, within } from '@testing-library/react';
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
    expect(within(result).getByRole('heading', { name: '出生运气' })).toBeVisible();
    expect(within(result).getByRole('heading', { name: '当前运气' })).toBeVisible();
    expect(within(result).getByText(/可能出生区间/)).toBeVisible();
    await user.click(screen.getByText('查看与当前的五行关系'));
    expect(within(result).getByText('中运水克司天火')).toBeVisible();
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
    expect(await screen.findByText(response.message)).toHaveClass('boundary-message');
    expect(screen.getByRole('heading', { name: '交节后可能结果' })).toBeVisible();
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
});
