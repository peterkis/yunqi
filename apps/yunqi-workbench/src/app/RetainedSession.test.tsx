import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../providers/AppProviders';
import { createWorkbenchQueryClient } from '../providers/QueryProvider';
import { createClientStub } from '../test/learning-fixtures';
import { fillBirthDate } from '../test/birth-input';
import { answerByKey } from '../test/constitution-input';
import { ANSWER_HOLD_MS } from '../features/constitution/components/ConstitutionForm';
import { App } from './App';

beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime }); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function ExternalTab() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/yunqi/current')}>外部切到当下</button>;
}

describe('tab session retention', () => {
  it('stops hidden current refresh and questionnaire refetch while keeping visible current refresh', async () => {
    const client = createClientStub();
    const queryClient = createWorkbenchQueryClient();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MemoryRouter initialEntries={['/yunqi/constitution']}><AppProviders yunqiClient={client} queryClient={queryClient}><App /></AppProviders></MemoryRouter>);
    await screen.findByRole('radio', { name: '男' });
    await waitFor(() => expect(client.getLearningCurrent).toHaveBeenCalledOnce());
    await user.click(screen.getByRole('link', { name: '先天对照' }));
    expect(screen.queryByRole('form', { name: '中医体质量表' })).not.toBeInTheDocument();
    const hidden = document.querySelector('.retained-session[hidden]')!;
    expect(hidden).toHaveAttribute('inert');
    const currentCalls = vi.mocked(client.getLearningCurrent).mock.calls.length;
    const questionnaireCalls = vi.mocked(client.getConstitutionQuestionnaire).mock.calls.length;
    await act(async () => { await queryClient.invalidateQueries(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
    expect(client.getLearningCurrent).toHaveBeenCalledTimes(currentCalls);
    expect(client.getConstitutionQuestionnaire).toHaveBeenCalledTimes(questionnaireCalls);
    await user.click(screen.getByRole('link', { name: '体质量表' }));
    await screen.findByRole('radio', { name: '男' });
    await waitFor(() => expect(client.getConstitutionQuestionnaire).toHaveBeenCalledTimes(questionnaireCalls + 1));
    await user.click(screen.getByRole('link', { name: '先天对照' }));
    await user.click(screen.getByRole('link', { name: '当下运气' }));
    await screen.findByText('当下运气', { selector: 'a' });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(vi.mocked(client.getLearningCurrent).mock.calls.length).toBeGreaterThan(currentCalls);
  });

  it('keeps the retained form and answers when a questionnaire refresh fails', async () => {
    const client = createClientStub();
    const queryClient = createWorkbenchQueryClient();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MemoryRouter initialEntries={['/yunqi/constitution']}><AppProviders yunqiClient={client} queryClient={queryClient}><App /></AppProviders></MemoryRouter>);
    const form = await screen.findByRole('form', { name: '中医体质量表' });
    await user.click(screen.getByRole('radio', { name: '男' }));
    await answerByKey(user, '4');
    act(() => { vi.advanceTimersByTime(ANSWER_HOLD_MS); });
    await user.click(screen.getByRole('link', { name: '先天对照' }));
    const calls = vi.mocked(client.getConstitutionQuestionnaire).mock.calls.length;
    vi.mocked(client.getConstitutionQuestionnaire).mockRejectedValue(new Error('offline'));
    await act(async () => { await queryClient.invalidateQueries({ queryKey: ['constitution', 'questionnaire'] }); });
    await user.click(screen.getByRole('link', { name: '体质量表' }));
    await waitFor(() => expect(client.getConstitutionQuestionnaire).toHaveBeenCalledTimes(calls + 1));
    await waitFor(() => expect(queryClient.getQueryState(['constitution', 'questionnaire'])?.status).toBe('error'));
    expect(screen.getByRole('form')).toBe(form);
    expect(screen.getByRole('img', { name: /已答 1 \/ 8 题/ })).toBeVisible();
    expect(screen.queryByText('体质量表加载失败')).not.toBeInTheDocument();
  });

  it('does not mount retained sessions for unknown child paths', () => {
    const client = createClientStub();
    render(<MemoryRouter initialEntries={['/yunqi/birth/unknown']}><AppProviders yunqiClient={client}><App /></AppProviders></MemoryRouter>);
    expect(within(screen.getByRole('main')).getByRole('heading', { name: '页面未找到' })).toBeVisible();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(client.getConstitutionQuestionnaire).not.toHaveBeenCalled();
    expect(client.getLearningCurrent).not.toHaveBeenCalled();
  });

  it('lazily retains standalone answers and results, releases hidden shell slots and does not replay a retained result', async () => {
    const client = createClientStub();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = render(<MemoryRouter initialEntries={['/yunqi/current']}><AppProviders yunqiClient={client}><App /><ExternalTab /></AppProviders></MemoryRouter>);
    await screen.findByRole('link', { name: '体质量表' });
    expect(client.getConstitutionQuestionnaire).not.toHaveBeenCalled();
    const storage = { local: { ...localStorage }, session: { ...sessionStorage } };
    await user.click(screen.getByRole('link', { name: '体质量表' }));
    const form = await screen.findByRole('form', { name: '中医体质量表' });
    await user.click(screen.getByRole('radio', { name: '男' }));
    await answerByKey(user, '4');
    fireEvent.keyDown(screen.getByRole('heading', { name: '测试问题 2？' }), { key: '2' });
    await user.click(screen.getByRole('link', { name: '当下运气' }));
    act(() => { vi.advanceTimersByTime(ANSWER_HOLD_MS); });
    expect(screen.getByRole('main')).toHaveFocus();
    expect(form).not.toBeVisible();
    expect(screen.queryByRole('button', { name: '结束并销毁答卷' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '体质量表' }));
    expect(screen.getByRole('form')).toBe(form);
    expect(screen.getByRole('img', { name: /已答 2 \/ 8 题，当前第 3/ })).toBeVisible();
    screen.getByRole('heading', { name: '测试问题 3？' }).focus();
    for (let index = 2; index < 8; index += 1) await answerByKey(user, String(index % 5 + 1));
    expect(screen.queryByRole('button', { name: '查看结果' })).not.toBeInTheDocument();
    const result = await screen.findByRole('region', { name: '体质测评结果' });
    expect(result).toHaveAttribute('data-reveal', 'true');
    await user.click(screen.getByRole('button', { name: '外部切到当下' }));
    expect(result).not.toBeVisible();
    expect(screen.queryByRole('button', { name: '返回修改' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '体质量表' }));
    expect(screen.getByRole('region', { name: '体质测评结果' })).toBe(result);
    expect(result).toHaveAttribute('data-reveal', 'false');
    await user.click(screen.getByRole('button', { name: '返回修改' }));
    expect(screen.getByRole('heading', { name: '男性适用测试问题？' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: '3 有时（有些）' })).toBeChecked();
    await answerByKey(user, '3');
    await screen.findByRole('region', { name: '体质测评结果' });
    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.getByRole('region', { name: '体质测评结果' })).toHaveAttribute('data-reveal', 'false');
    expect(client.assessConstitution).toHaveBeenCalledTimes(2);
    expect({ local: { ...localStorage }, session: { ...sessionStorage } }).toEqual(storage);
    unmount();
    render(<MemoryRouter initialEntries={['/yunqi/constitution']}><AppProviders yunqiClient={client}><App /></AppProviders></MemoryRouter>);
    expect(await screen.findByRole('radio', { name: '男' })).not.toBeChecked();
    expect(screen.queryByRole('region', { name: '体质测评结果' })).not.toBeInTheDocument();
  });

  it('keeps an existing standalone draft when a birth-linked assessment is opened and discarded', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MemoryRouter initialEntries={['/yunqi/constitution']}><AppProviders yunqiClient={createClientStub()}><App /></AppProviders></MemoryRouter>);
    const draft = await screen.findByRole('form', { name: '中医体质量表' });
    await user.click(within(draft).getByRole('radio', { name: '女' }));
    await answerByKey(user, '4');
    await user.click(screen.getByRole('link', { name: '先天对照' }));
    await fillBirthDate('1990-05-12');
    await user.click(screen.getByRole('button', { name: '确认并对照' }));
    await screen.findByRole('button', { name: '同时测评体质' });
    await user.click(screen.getByRole('link', { name: '体质量表' }));
    const linked = await screen.findByRole('form', { name: '中医体质量表' });
    expect(linked).not.toBe(draft);
    expect(within(linked).getByRole('radio', { name: '女' })).not.toBeChecked();
    await user.click(screen.getByRole('link', { name: '先天对照' }));
    await user.click(screen.getByRole('button', { name: '清空本次资料' }));
    await user.click(screen.getByRole('link', { name: '体质量表' }));
    expect(screen.getByRole('form', { name: '中医体质量表' })).toBe(draft);
    expect(within(draft).getByRole('img', { name: /已答 1 \/ 8/ })).toBeVisible();
  });

  it('retains the comparison and its linked questionnaire across tabs, then clears explicitly', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const client = createClientStub();
    render(<MemoryRouter initialEntries={['/yunqi/birth']}><AppProviders yunqiClient={client}><App /></AppProviders></MemoryRouter>);
    await fillBirthDate('1990-05-12');
    await user.click(screen.getByRole('link', { name: '体质量表' }));
    await user.click(screen.getByRole('link', { name: '先天对照' }));
    expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('1990');
    await screen.findByText('公历 1990-05-12');
    await user.click(screen.getByRole('button', { name: '确认并对照' }));
    await screen.findByRole('button', { name: '同时测评体质' });
    await user.click(screen.getByRole('button', { name: '同时测评体质' }));
    const form = await screen.findByRole('form', { name: '中医体质量表' });
    await user.click(within(form).getByRole('radio', { name: '女' }));
    await answerByKey(user, '5');
    expect(screen.getByRole('link', { name: '体质量表' })).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('link', { name: '先天对照' }));
    expect(screen.queryByRole('form', { name: '中医体质量表' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '结束并销毁答卷' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '体质量表' }));
    expect(screen.getByRole('form')).toBe(form);
    expect(screen.getByRole('img', { name: /已答 1 \/ 8/ })).toBeVisible();
    expect(client.compareBirth).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: '结束并销毁答卷' }));
    await user.click(screen.getByRole('button', { name: '确认销毁' }));
    expect(screen.getByRole('button', { name: '同时测评体质' })).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('答卷已销毁');
    await user.click(screen.getByRole('button', { name: '清空本次资料' }));
    await user.click(screen.getByRole('link', { name: '当下运气' }));
    await user.click(screen.getByRole('link', { name: '先天对照' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: '年' })).toHaveValue(''));
    expect(screen.queryByRole('button', { name: '同时测评体质' })).not.toBeInTheDocument();
  });
});
