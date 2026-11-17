import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createAssessmentDto, createBirthComparisonDto, createClientStub, createQuestionnaireDto } from '../../../../test/learning-fixtures';
import { createTestWrapper } from '../../../../test/test-utils';
import { BirthComparisonPage } from './BirthComparisonPage';

async function submitBirth(user: ReturnType<typeof userEvent.setup>) {
  fireEvent.change(screen.getByLabelText('出生日期（公历）'), { target: { value: '1990-05-12' } });
  await user.click(screen.getByRole('button', { name: '查看出生与当前运气' }));
  return screen.findByRole('region', { name: '出生与当前运气对照结果' });
}

async function openAssessment(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '同时测评体质' }));
  return screen.findByRole('form', { name: '中医体质量表' });
}

async function completeAssessment(user: ReturnType<typeof userEvent.setup>, form: HTMLElement) {
  await user.click(within(form).getByRole('radio', { name: '男' }));
  for (let group = 0; group < 2; group += 1) {
    for (const answer of within(form).getAllByRole('radio', { name: '没有' })) await user.click(answer);
    if (group === 0) await user.click(within(form).getByRole('button', { name: '下一组' }));
  }
  await user.click(within(form).getByRole('button', { name: '生成体质测评结果' }));
}

describe('birth comparison assessment session', () => {
  it('drills into birth-scoped readings while retaining matching current readings separately', async () => {
    const user = userEvent.setup();
    const client = createClientStub();
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(client) });
    await submitBirth(user);
    await user.click(screen.getByRole('link', { name: '全部原文' }));
    const reading = screen.getByRole('region', { name: '先天原文与释义' });
    expect(within(reading).getByRole('button', { name: '出生阶段' })).toHaveAttribute('aria-pressed', 'true');
    const historical = within(reading).getByRole('region', { name: '出生运气原文' });
    expect(within(historical).getByText('出生阶段', { exact: true })).toBeVisible();
    expect(within(historical).queryByText('当前阶段', { exact: true })).not.toBeInTheDocument();
    expect(within(historical).getByText('阅读释义')).toBeVisible();
    expect(within(historical).getByRole('link', { name: /查看原文出处/ })).toHaveAttribute('href', 'https://example.org/classics');
    await user.click(within(reading).getByRole('button', { name: '全年' }));
    expect(within(historical).getByText('全年 · 司天')).toBeVisible();
    const current = within(reading).getByText('对照时的当下原文').closest('details')!;
    expect(current).not.toHaveAttribute('open');
    await user.click(within(current).getByText('对照时的当下原文'));
    expect(within(current).getAllByRole('blockquote')).toHaveLength(2);
    expect(within(current).getByText('当下阶段', { exact: true })).toBeVisible();
    expect(client.getConstitutionQuestionnaire).not.toHaveBeenCalled();
  });

  it('opens one lazy questionnaire for all candidates and keeps the birth response snapshot', async () => {
    const user = userEvent.setup();
    const original = createBirthComparisonDto();
    const dto = { ...original, ambiguous: true, candidates: [...original.candidates, { ...original.candidates[0], label: '第二个可能归属' }] };
    const client = createClientStub({ compareBirth: vi.fn().mockResolvedValue(dto) });
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(client) });
    await submitBirth(user);
    expect(client.getConstitutionQuestionnaire).not.toHaveBeenCalled();
    expect(screen.queryByRole('form', { name: '中医体质量表' })).not.toBeInTheDocument();
    const form = await openAssessment(user);
    expect(screen.getAllByRole('form', { name: '中医体质量表' })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: '本次体质测评' })).toHaveFocus();
    expect(client.getConstitutionQuestionnaire).toHaveBeenCalledOnce();
    expect(client.getLearningCurrent).not.toHaveBeenCalled();
    expect(client.assessConstitution).not.toHaveBeenCalled();
    const context = screen.getByRole('complementary', { name: '本次测评对照背景' });
    expect(within(context).getByText('第二个可能归属')).toBeVisible();
    expect(context.querySelector('time')).toHaveAttribute('datetime', dto.current.facts.input.localTime);
    expect(form.parentElement?.closest('form')).toBeNull();
    await user.click(within(form).getByRole('radio', { name: '男' }));
    await user.click(within(form).getAllByRole('radio', { name: '有时' })[0]);
    expect(within(form).getByText('已答 1 / 8 题')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '结束本次测评' }));
    expect(screen.queryByRole('form', { name: '中医体质量表' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '同时测评体质' })).toHaveFocus();
    const restarted = await openAssessment(user);
    expect(within(restarted).getByRole('radio', { name: '男' })).not.toBeChecked();
    expect(within(restarted).queryByRole('radio', { name: '有时' })).not.toBeInTheDocument();
  });

  it.each(['date', 'time', 'known-time', 'clear', 'resubmit'] as const)('discards the answer session after %s changes the comparison', async (action) => {
    const user = userEvent.setup();
    const client = createClientStub({ compareBirth: vi.fn().mockResolvedValue({ ...createBirthComparisonDto(), birthPrecision: 'time' }) });
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(client) });
    fireEvent.change(screen.getByLabelText('出生日期（公历）'), { target: { value: '1990-05-12' } });
    await user.click(screen.getByLabelText('知道出生时刻'));
    fireEvent.change(screen.getByLabelText('出生时刻（北京时间）'), { target: { value: '09:30' } });
    await user.click(screen.getByRole('button', { name: '查看出生与当前运气' }));
    await screen.findByRole('region', { name: '出生与当前运气对照结果' });
    const form = await openAssessment(user);
    await user.click(within(form).getByRole('radio', { name: '女' }));
    await user.click(within(form).getAllByRole('radio', { name: '经常' })[0]);
    if (action === 'date') fireEvent.change(screen.getByLabelText('出生日期（公历）'), { target: { value: '1990-05-13' } });
    if (action === 'time') fireEvent.change(screen.getByLabelText('出生时刻（北京时间）'), { target: { value: '09:31' } });
    if (action === 'known-time') await user.click(screen.getByLabelText('知道出生时刻'));
    if (action === 'clear') await user.click(screen.getByRole('button', { name: '清空本次资料' }));
    if (action === 'resubmit') await user.click(screen.getByRole('button', { name: '查看出生与当前运气' }));
    expect(screen.queryByRole('form', { name: '中医体质量表' })).not.toBeInTheDocument();
    if (action !== 'resubmit') {
      if (action === 'clear') fireEvent.change(screen.getByLabelText('出生日期（公历）'), { target: { value: '1991-06-13' } });
      await user.click(screen.getByRole('button', { name: '查看出生与当前运气' }));
    }
    await screen.findByRole('region', { name: '出生与当前运气对照结果' });
    const fresh = await openAssessment(user);
    expect(within(fresh).getByRole('radio', { name: '女' })).not.toBeChecked();
    await user.click(within(fresh).getByRole('radio', { name: '女' }));
    expect(within(fresh).getByText('已答 0 / 8 题')).toBeVisible();
    expect(client.assessConstitution).not.toHaveBeenCalled();
  });

  it.each(['edit-birth', 'end', 'clear', 'resubmit'] as const)('does not revive a previous score after %s ends its local session', async (action) => {
    const user = userEvent.setup();
    let resolveScore!: (value: ReturnType<typeof createAssessmentDto>) => void;
    const client = createClientStub({ assessConstitution: vi.fn(() => new Promise<ReturnType<typeof createAssessmentDto>>((resolve) => { resolveScore = resolve; })) });
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(client) });
    await submitBirth(user);
    await completeAssessment(user, await openAssessment(user));
    await waitFor(() => expect(client.assessConstitution).toHaveBeenCalledOnce());
    expect(screen.getByRole('status')).toHaveTextContent('正在按量表规则计分');
    if (action === 'edit-birth') fireEvent.change(screen.getByLabelText('出生日期（公历）'), { target: { value: '1992-08-09' } });
    if (action === 'end') await user.click(screen.getByRole('button', { name: '结束本次测评' }));
    if (action === 'clear') await user.click(screen.getByRole('button', { name: '清空本次资料' }));
    if (action === 'resubmit') await user.click(screen.getByRole('button', { name: '查看出生与当前运气' }));
    expect(screen.queryByRole('form', { name: '中医体质量表' })).not.toBeInTheDocument();
    if (action === 'clear') fireEvent.change(screen.getByLabelText('出生日期（公历）'), { target: { value: '1993-05-14' } });
    if (action === 'clear' || action === 'edit-birth') await user.click(screen.getByRole('button', { name: '查看出生与当前运气' }));
    await screen.findByRole('region', { name: '出生与当前运气对照结果' });
    const fresh = await openAssessment(user);
    await act(async () => { resolveScore(createAssessmentDto()); });
    expect(screen.queryByRole('region', { name: '体质测评结果' })).not.toBeInTheDocument();
    expect(within(fresh).getByRole('radio', { name: '男' })).not.toBeChecked();
    expect(client.getLearningCurrent).not.toHaveBeenCalled();
  });

  it('keeps the comparison available when the lazy questionnaire fails and retries independently', async () => {
    const user = userEvent.setup();
    const client = createClientStub({ getConstitutionQuestionnaire: vi.fn().mockRejectedValueOnce(new Error('private questionnaire error')).mockResolvedValueOnce(createQuestionnaireDto()) });
    render(<BirthComparisonPage />, { wrapper: createTestWrapper(client) });
    const comparison = await submitBirth(user);
    await user.click(screen.getByRole('button', { name: '同时测评体质' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('体质量表加载失败');
    expect(comparison).toBeVisible();
    expect(screen.queryByText(/private questionnaire/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));
    await screen.findByRole('form', { name: '中医体质量表' });
    expect(client.compareBirth).toHaveBeenCalledOnce();
    expect(client.getLearningCurrent).not.toHaveBeenCalled();
  });
});
