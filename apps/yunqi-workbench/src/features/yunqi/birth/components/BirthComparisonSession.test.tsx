import { answerByKey } from '../../../../test/constitution-input';
import { fillBirthDate } from '../../../../test/birth-input';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../../../../providers/AppProviders';
import { PanelShell } from '../../../../components/layout/PanelShell';
import { createWorkbenchQueryClient } from '../../../../providers/QueryProvider';
import { createAssessmentDto, createBirthComparisonDto, createClientStub, createQuestionnaireDto } from '../../../../test/learning-fixtures';
import { createTestWrapper } from '../../../../test/test-utils';
import { AppRoutes } from '../../../../app/AppRoutes';

async function submitBirth(user: ReturnType<typeof userEvent.setup>) {
  await fillBirthDate('1990-05-12');
  await user.click(screen.getByRole('button', { name: '确认并对照' }));
  return screen.findByRole('region', { name: '出生与当前运气对照结果' });
}

async function openAssessment(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '同时测评体质' }));
  expect(screen.getByRole('link', { name: '体质量表' })).toHaveAttribute('aria-current', 'page');
  return screen.findByRole('form', { name: '中医体质量表' });
}

async function completeAssessment(user: ReturnType<typeof userEvent.setup>, form: HTMLElement) {
  await user.click(within(form).getByRole('radio', { name: '男性量表' }));
  for (let index = 0; index < 8; index += 1) await answerByKey(user, '1');
  expect(screen.queryByRole('button', { name: '查看结果' })).not.toBeInTheDocument();
}

beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime }); vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true }))); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('birth comparison assessment session', () => {
  it('drills into birth-scoped readings while retaining matching current readings separately', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const client = createClientStub();
    render(<AppRoutes />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    await submitBirth(user);
    await user.click(screen.getByRole('link', { name: '全部原文' }));
    const reading = screen.getByRole('region', { name: '先天原文与释义' });
    expect(within(reading).getByRole('button', { name: '出生阶段' })).toHaveAttribute('aria-pressed', 'true');
    const historical = within(reading).getByRole('region', { name: '出生运气原文' });
    expect(within(historical).getByText('出生阶段', { exact: true })).toBeVisible();
    expect(within(historical).queryByText('当前阶段', { exact: true })).not.toBeInTheDocument();
    expect(within(historical).getByText('原 文')).toBeVisible();
    expect(within(historical).getByText('释 义')).toBeVisible();
    expect(within(historical).getByText('出生阶段', { exact: true })).not.toHaveClass('classics-card__badge--current');
    expect(reading.querySelector('.classics-card--current')).not.toBeInTheDocument();
    expect(within(historical).getByRole('link', { name: /^出处/ })).toHaveAttribute('href', 'https://example.org/classics');
    await user.click(within(reading).getByRole('button', { name: '全年' }));
    expect(within(historical).getByText('全年适用')).toBeVisible();
    const current = within(reading).getByText('对照时的当下原文').closest('details')!;
    expect(current).not.toHaveAttribute('open');
    await user.click(within(current).getByText('对照时的当下原文'));
    expect(within(current).getAllByRole('blockquote')).toHaveLength(2);
    expect(within(current).getByText('当下阶段', { exact: true })).toBeVisible();
    expect(client.getConstitutionQuestionnaire).not.toHaveBeenCalled();
  });

  it('opens one lazy questionnaire for all candidates and keeps the birth response snapshot', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const original = createBirthComparisonDto();
    const dto = { ...original, ambiguous: true, candidates: [...original.candidates, { ...original.candidates[0], label: '第二个可能归属' }] };
    const client = createClientStub({ compareBirth: vi.fn().mockResolvedValue(dto) });
    render(<AppRoutes />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
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
    expect(within(context).getByRole('group', { name: /第二个可能归属/ })).toHaveTextContent('2 个候选');
    await user.click(screen.getByText('本次对照快照与候选区间'));
    const notes = document.querySelector('.constitution-notes') as HTMLElement;
    expect(within(notes).getByRole('region', { name: '第二个可能归属' })).toBeVisible();
    expect(within(notes).getByRole('region', { name: '当下快照' })).toHaveTextContent(dto.current.facts.sixQi.sitian);
    expect(form.parentElement?.closest('form')).toBeNull();
    await user.click(within(form).getByRole('radio', { name: '男性量表' }));
    await user.click(within(form).getAllByRole('radio', { name: '3 有时（有些）' })[0]);
    expect(within(form).getByRole('img', { name: /已答 1 \/ 8/ })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '结束并销毁' }));
    await user.click(screen.getByRole('button', { name: '确认销毁' }));
    expect(screen.getByRole('link', { name: '体质量表' })).toHaveAttribute('aria-current', 'page');
    expect(within(form).getByRole('radio', { name: '男性量表' })).toHaveFocus();
    expect(within(form).getByRole('radio', { name: '男性量表' })).not.toBeChecked();
    expect(within(form).queryByRole('radio', { name: '3 有时（有些）' })).not.toBeInTheDocument();
    expect(within(context).getByRole('group', { name: /第二个可能归属/ })).toHaveTextContent('2 个候选');
  });

  it.each(['click', 'keyboard'] as const)('destroys a scored session with %s and restores focus to the edition selector', async (activation) => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const client = createClientStub();
    render(<AppRoutes />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    const comparison = await submitBirth(user);
    await completeAssessment(user, await openAssessment(user));
    const result = await screen.findByRole('region', { name: '体质测评结果' });
    const end = screen.getByRole('button', { name: '结束并销毁' });
    if (activation === 'keyboard') {
      // Chromium covers summary traversal; jsdom starts at the first action.
      screen.getByRole('button', { name: '返回修改' }).focus();
      await user.tab();
      expect(end).toHaveFocus();
      await user.keyboard('{Enter}');
    } else await user.click(end);
    if (activation === 'keyboard') {
      await user.tab();
      expect(screen.getByRole('button', { name: '确认销毁' })).toHaveFocus();
      await user.keyboard('{Enter}');
    } else await user.click(screen.getByRole('button', { name: '确认销毁' }));
    expect(result).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '体质量表' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('button', { name: '结束并销毁' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '男性量表' })).toHaveFocus();
    await user.click(screen.getByRole('link', { name: '先天对照' }));
    expect(comparison).toBeVisible();
    const restarted = await openAssessment(user);
    expect(within(restarted).getByRole('radio', { name: '男性量表' })).not.toBeChecked();
    expect(screen.queryByRole('region', { name: '体质测评结果' })).not.toBeInTheDocument();
    expect(client.assessConstitution).toHaveBeenCalledOnce();
  });

  it.each(['date', 'time', 'known-time', 'clear', 'resubmit'] as const)('discards the answer session after %s changes the comparison', async (action) => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const client = createClientStub({ compareBirth: vi.fn().mockResolvedValue({ ...createBirthComparisonDto(), birthPrecision: 'time' }) });
    render(<AppRoutes />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    await fillBirthDate('1990-03-21');
    await user.click(screen.getByRole('button', { name: /补录时刻/ }));
    fireEvent.change(screen.getByLabelText('出生时刻', { exact: true }), { target: { value: '09:30' } });
    await user.click(screen.getByRole('button', { name: '确认并对照' }));
    await screen.findByRole('region', { name: '出生与当前运气对照结果' });
    const form = await openAssessment(user);
    await user.click(within(form).getByRole('radio', { name: '女性量表' }));
    await user.click(within(form).getAllByRole('radio', { name: '4 经常（相当）' })[0]);
    await user.click(screen.getByRole('link', { name: '先天对照' }));
    if (action !== 'clear') {
      await user.click(screen.getByRole('button', { name: '修改' }));
      expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('1990');
      if (action !== 'date') {
        await fillBirthDate('1990-03-21');
        expect(screen.getByLabelText('出生时刻', { exact: true })).toHaveValue('09:30');
        expect(screen.getByRole('textbox', { name: '年' })).toHaveFocus();
      }
    }
    if (action === 'date') await fillBirthDate('1990-05-13');
    if (action === 'time') fireEvent.change(screen.getByLabelText('出生时刻', { exact: true }), { target: { value: '09:31' } });
    if (action === 'known-time') await user.click(screen.getByRole('button', { name: '时刻不详' }));
    if (action === 'clear') await user.click(screen.getByRole('button', { name: '清空本次资料' }));
    if (action === 'resubmit') await user.click(screen.getByRole('button', { name: '确认并对照' }));
    expect(screen.queryByRole('form', { name: '中医体质量表' })).not.toBeInTheDocument();
    if (action !== 'resubmit') {
      if (action === 'clear') await fillBirthDate('1991-06-13');
      await user.click(screen.getByRole('button', { name: '确认并对照' }));
    }
    await screen.findByRole('region', { name: '出生与当前运气对照结果' });
    const fresh = await openAssessment(user);
    expect(within(fresh).getByRole('radio', { name: '女性量表' })).not.toBeChecked();
    await user.click(within(fresh).getByRole('radio', { name: '女性量表' }));
    expect(within(fresh).getByRole('img', { name: /已答 0 \/ 8/ })).toBeVisible();
    expect(client.assessConstitution).not.toHaveBeenCalled();
  });

  it.each(['edit-birth', 'end', 'clear', 'resubmit'] as const)('does not revive a previous score after %s ends its local session', async (action) => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let resolveScore!: (value: ReturnType<typeof createAssessmentDto>) => void;
    const client = createClientStub({ assessConstitution: vi.fn(() => new Promise<ReturnType<typeof createAssessmentDto>>((resolve) => { resolveScore = resolve; })) });
    render(<AppRoutes />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    await submitBirth(user);
    await completeAssessment(user, await openAssessment(user));
    await waitFor(() => expect(client.assessConstitution).toHaveBeenCalledOnce());
    expect(screen.getByRole('status')).toHaveTextContent('正在按量表规则计分');
    if (action !== 'end') await user.click(screen.getByRole('link', { name: '先天对照' }));
    if (action === 'edit-birth' || action === 'resubmit') {
      await user.click(screen.getByRole('button', { name: '修改' }));
      expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('1990');
      if (action === 'resubmit') await fillBirthDate('1990-05-12');
    }
    if (action === 'edit-birth') await fillBirthDate('1992-08-09');
    if (action === 'end') {
      await user.click(screen.getByRole('button', { name: '结束并销毁' }));
      await user.click(screen.getByRole('button', { name: '确认销毁' }));
      expect(screen.getByRole('radio', { name: '男性量表' })).toHaveFocus();
      await user.click(screen.getByRole('link', { name: '先天对照' }));
    }
    if (action === 'clear') await user.click(screen.getByRole('button', { name: '清空本次资料' }));
    if (action === 'resubmit') await user.click(screen.getByRole('button', { name: '确认并对照' }));
    expect(screen.queryByRole('form', { name: '中医体质量表' })).not.toBeInTheDocument();
    if (action === 'clear') await fillBirthDate('1993-05-14');
    if (action === 'clear' || action === 'edit-birth') await user.click(screen.getByRole('button', { name: '确认并对照' }));
    await screen.findByRole('region', { name: '出生与当前运气对照结果' });
    const fresh = await openAssessment(user);
    await act(async () => { resolveScore(createAssessmentDto()); });
    expect(screen.queryByRole('region', { name: '体质测评结果' })).not.toBeInTheDocument();
    expect(within(fresh).getByRole('radio', { name: '男性量表' })).not.toBeChecked();
    expect(client.getLearningCurrent).not.toHaveBeenCalled();
  });

  it('keeps the comparison available when the lazy questionnaire fails and retries independently', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const client = createClientStub({ getConstitutionQuestionnaire: vi.fn().mockRejectedValueOnce(new Error('private questionnaire error')).mockResolvedValueOnce(createQuestionnaireDto()) });
    render(<AppRoutes />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    const comparison = await submitBirth(user);
    await user.click(screen.getByRole('button', { name: '同时测评体质' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('体质量表加载失败');
    expect(comparison).not.toBeVisible();
    expect(screen.queryByText(/private questionnaire/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));
    await screen.findByRole('form', { name: '中医体质量表' });
    await user.click(screen.getByRole('link', { name: '先天对照' }));
    expect(comparison).toBeVisible();
    expect(client.compareBirth).toHaveBeenCalledOnce();
    expect(client.getLearningCurrent).not.toHaveBeenCalled();
  });

  it('gives expanded birth inputs sole ownership of the action bar while retaining a scored session', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AppRoutes />, { wrapper: createTestWrapper(createClientStub(), '/yunqi/birth') });
    await submitBirth(user);
    await completeAssessment(user, await openAssessment(user));
    const result = await screen.findByRole('region', { name: '体质测评结果' });
    expect(screen.getByRole('button', { name: '返回修改' }).closest('.panel-shell__actions')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: '返回' }));
    await user.click(screen.getByRole('link', { name: '先天对照' }));
    await user.click(screen.getByRole('button', { name: '修改' }));
    expect(result).not.toBeVisible();
    expect(screen.getByRole('button', { name: '确认并对照' }).closest('form')).not.toBeNull();
    expect(screen.queryByRole('button', { name: '结束并销毁' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '返回修改' })).not.toBeInTheDocument();
    expect(document.querySelectorAll('.ds-button--primary')).toHaveLength(1);
    expect(screen.getByRole('navigation', { name: '工作台导航' })).toBeVisible();
  });
  it('keeps empty loading and failed sessions free of a destroy action and ignores discarded loads', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let reject!: (reason: Error) => void;
    const client = createClientStub({ getConstitutionQuestionnaire: vi.fn(() => new Promise<ReturnType<typeof createQuestionnaireDto>>((_, fail) => { reject = fail; })) });
    render(<AppRoutes />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
    await submitBirth(user);
    await user.click(screen.getByRole('button', { name: '同时测评体质' }));
    expect(await screen.findByRole('status')).toHaveTextContent('正在加载体质量表');
    expect(screen.queryByRole('button', { name: '结束并销毁' })).not.toBeInTheDocument();
    expect(document.querySelector('footer.constitution-session-footer')).toBeVisible();
    await user.click(screen.getByRole('link', { name: '先天对照' }));
    expect(screen.getByRole('region', { name: '出生与当前运气对照结果' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '清空本次资料' }));
    await act(async () => { reject(new Error('private questionnaire failure')); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await submitBirth(user);
    await user.click(screen.getByRole('button', { name: '同时测评体质' }));
    await act(async () => { reject(new Error('private questionnaire failure')); });
    expect(await screen.findByRole('alert')).toHaveTextContent('体质量表加载失败');
    expect(screen.queryByRole('button', { name: '结束并销毁' })).not.toBeInTheDocument();
    expect(client.assessConstitution).not.toHaveBeenCalled();
    await user.click(screen.getByRole('link', { name: '先天对照' }));
    expect(screen.getByRole('region', { name: '出生与当前运气对照结果' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '清空本次资料' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not offer destruction for an empty reopened session when the cached questionnaire refresh fails', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const client = createClientStub({ getConstitutionQuestionnaire: vi.fn().mockResolvedValueOnce(createQuestionnaireDto()).mockRejectedValueOnce(new Error('private refresh failure')) });
    const queryClient = createWorkbenchQueryClient();
    render(<MemoryRouter initialEntries={['/yunqi/birth']}><AppProviders queryClient={queryClient} yunqiClient={client}><PanelShell><AppRoutes /></PanelShell></AppProviders></MemoryRouter>);
    await submitBirth(user);
    const form = await openAssessment(user);
    expect(screen.queryByRole('button', { name: '结束并销毁' })).not.toBeInTheDocument();
    await user.click(within(form).getByRole('radio', { name: '男性量表' }));
    await answerByKey(user, '1');
    await user.click(screen.getByRole('button', { name: '结束并销毁' }));
    await user.click(screen.getByRole('button', { name: '确认销毁' }));
    // The production cache stays fresh for five minutes. Mark this owned
    // cache stale explicitly, then exercise the real reopening/refetch path.
    await user.click(screen.getByRole('link', { name: '先天对照' }));
    await queryClient.invalidateQueries({ queryKey: ['constitution', 'questionnaire'], refetchType: 'none' });
    await user.click(screen.getByRole('button', { name: '同时测评体质' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('体质量表加载失败');
    expect(screen.queryByRole('button', { name: '结束并销毁' })).not.toBeInTheDocument();
    expect(document.querySelector('footer.constitution-session-footer')).toBeVisible();
    await user.click(screen.getByRole('link', { name: '先天对照' }));
    expect(screen.getByRole('region', { name: '出生与当前运气对照结果' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '清空本次资料' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

});
