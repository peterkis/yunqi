import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAssessmentDto, createClientStub, createQuestionnaireDto } from '../../../test/learning-fixtures';
import { createTestWrapper } from '../../../test/test-utils';
import { mapQuestionnaire } from '../presentation/map-constitution';
import { ConstitutionForm } from './ConstitutionForm';

function renderForm(client = createClientStub()) {
  const questionnaire = mapQuestionnaire(createQuestionnaireDto());
  return { ...render(<ConstitutionForm questionnaire={questionnaire} />, { wrapper: createTestWrapper(client, '/yunqi/constitution') }), client, questionnaire };
}

async function complete(user: ReturnType<typeof userEvent.setup>, sex = '男') {
  await user.click(screen.getByRole('radio', { name: sex }));
  for (let index = 1; index <= 8; index += 1) {
    expect(screen.getByRole('img', { name: new RegExp(`当前第 ${index} 题`) })).toBeVisible();
    await user.keyboard(String((index - 1) % 5 + 1));
  }
  expect(screen.getByRole('heading', { name: '8 题已全部作答' })).toHaveFocus();
  expect(screen.getByRole('button', { name: '查看结果' })).toHaveClass('ds-button--primary');
}

beforeEach(() => { vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true }))); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('ConstitutionForm', () => {
  it('combines the context and nine dimensions, counts shared answers, and keeps only the question and hint in the header', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('radio', { name: '男' }));
    const context = screen.getByRole('complementary', { name: '本次测评对照背景' });
    const progress = within(context).getByRole('list', { name: '九种体质作答进度' });
    expect(within(progress).getAllByRole('listitem')).toHaveLength(9);
    const current = () => [...progress.querySelectorAll('[data-current="true"] .constitution-dimension-name')].map((node) => node.textContent);
    expect(current()).toEqual(['平和', '气虚']);
    expect(document.querySelector('.constitution-question-header')).toHaveTextContent('测试问题 1？请患者根据近一年的体验和感觉作答 · 数字键 1–5');
    expect(document.querySelector('.constitution-question-header')).not.toHaveTextContent(/体质量表|男性版|0\s*\/\s*8/);
    await user.keyboard('1');
    expect(current()).toEqual(['平和', '阳虚']);
    expect(within(progress).getByRole('img', { name: '平和质：1/2，当前题所属维度' })).toHaveStyle({ '--constitution-progress': '50%' });
    expect(within(progress).getByRole('img', { name: '气虚质：1/2' })).toHaveStyle({ '--constitution-progress': '50%' });
    await user.keyboard('2');
    expect(within(context).getByRole('img', { name: '已答 2 / 8 题，当前第 3 题' })).toHaveTextContent('2 / 8');
    expect(within(progress).getByRole('img', { name: '平和质：2/2，全部答完' }).closest('[role="listitem"]')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: '上一题' }));
    expect(current()).toEqual(['平和', '阳虚']);
    expect(within(context).getByRole('img', { name: '已答 2 / 8 题，当前第 2 题' })).toBeVisible();
    const notes = document.querySelector('.constitution-notes')!;
    expect(within(notes as HTMLElement).getByText('量表来源与适用说明')).toBeVisible();
  });

  it('keeps the secondary destroy action in the shell throughout answering and switches the result actions and header', async () => {
    const user = userEvent.setup();
    renderForm();
    const destroy = () => screen.queryAllByRole('button', { name: '结束并销毁答卷' });
    expect(destroy()).toHaveLength(0);
    expect(document.querySelector('footer.constitution-session-footer')).toHaveTextContent('答卷仅存本次会话，不入库 · 结束即销毁');
    await user.click(screen.getByRole('radio', { name: '男' }));
    expect(destroy()).toHaveLength(1);
    expect(destroy()[0].closest('.panel-shell__actions')).not.toBeNull();
    expect(document.querySelector('.constitution-progress-header')).toHaveTextContent('体质维度 · 男性版更换0 / 8');
    await user.keyboard('1');
    expect(destroy()).toHaveLength(1);
    expect(destroy()[0]).toHaveClass('ds-button--secondary');
    await user.click(destroy()[0]);
    expect(destroy()).toHaveLength(0);
    expect(screen.getByRole('radiogroup', { name: '量表所用性别' })).toBeVisible();
    await complete(user);
    expect(destroy()).toHaveLength(1);
    const submit = screen.getByRole('button', { name: '查看结果' });
    expect(submit.closest('.panel-shell__actions')).not.toBeNull();
    expect(submit).toHaveAttribute('form', screen.getByRole('form').id);
    expect(screen.getByRole('form').querySelector('.ds-button--primary')).toBeNull();
    await user.click(screen.getByRole('button', { name: '查看结果' }));
    await screen.findByRole('region', { name: '体质测评结果' });
    expect(screen.queryByRole('button', { name: '更换' })).not.toBeInTheDocument();
    expect(document.querySelector('.constitution-sex-summary')).toBeNull();
    expect(destroy()).toHaveLength(1);
    const actions = document.querySelector('.panel-shell__actions')!;
    const edit = within(actions as HTMLElement).getByRole('button', { name: '返回修改' });
    expect(within(actions as HTMLElement).getAllByRole('button')).toEqual([edit, destroy()[0]]);
    expect(edit).toHaveTextContent('‹ 返回修改');
    expect(edit).toHaveAccessibleName('返回修改');
    expect(edit.querySelector('[aria-hidden="true"]')).toHaveTextContent('‹');
    expect(edit).toHaveClass('ds-button--text');
    expect(document.querySelector('.panel-shell__content + .panel-shell__actions + .panel-shell__footer')).not.toBeNull();
    expect(screen.queryByRole('navigation', { name: '工作台导航' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: '页面导航' })).getByRole('heading', { name: '体质测评结果' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '返回' }));
    expect(screen.queryByRole('region', { name: '体质测评结果' })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '工作台导航' })).toBeVisible();
    await user.keyboard('3');
    await user.click(screen.getByRole('button', { name: '查看结果' }));
    await screen.findByRole('region', { name: '体质测评结果' });
    await user.click(screen.getByRole('button', { name: '返回修改' }));
    await user.click(screen.getByRole('button', { name: '更换' }));
    await user.click(screen.getByRole('button', { name: '确认' }));
    await user.click(screen.getByRole('radio', { name: '女' }));
    expect(destroy()).toHaveLength(1);
    expect(screen.queryByRole('region', { name: '体质测评结果' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /已答 0/ })).toBeVisible();
  });

  it('starts unanswered, blocks partial scoring and completes a keyboard session before an explicit submit', async () => {
    const user = userEvent.setup();
    const { client, questionnaire } = renderForm();
    expect(screen.getAllByRole('radio', { checked: false })).toHaveLength(2);
    fireEvent.submit(screen.getByRole('form'));
    expect(screen.getByRole('alert')).toHaveTextContent('请先选择量表所用性别');
    expect(screen.getByRole('group', { name: '量表所用性别' })).toHaveFocus();
    await user.click(screen.getByRole('radio', { name: '男' }));
    expect(screen.getByRole('img', { name: /已答 0 \/ 8/ })).toBeVisible();
    expect(screen.getAllByRole('radiogroup')).toHaveLength(1);
    expect(screen.getAllByRole('radio', { checked: false })).toHaveLength(5);
    expect(screen.queryByRole('radiogroup', { name: '量表所用性别' })).not.toBeInTheDocument();
    expect(document.querySelector('.constitution-sex-summary')).toHaveTextContent('体质维度 · 男性版更换');
    expect(screen.getByRole('button', { name: '上一题' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '查看结果' })).not.toBeInTheDocument();
    fireEvent.submit(screen.getByRole('form'));
    expect(screen.getByRole('alert')).toHaveTextContent('还有 8 题未作答');
    expect(client.assessConstitution).not.toHaveBeenCalled();
    for (let index = 1; index <= 8; index += 1) {
      expect(screen.getByRole('img', { name: new RegExp(`当前第 ${index} 题`) })).toBeVisible();
      await user.keyboard(String((index - 1) % 5 + 1));
    }
    expect(screen.getByRole('heading', { name: '8 题已全部作答' })).toHaveFocus();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(client.assessConstitution).not.toHaveBeenCalled();
    await user.tab();
    expect(screen.getByRole('button', { name: '返回修改' })).toHaveFocus();
    // Exercise the last content target before the shell actions. Chromium's
    // summary Tab sequence is also covered by the browser flow.
    await user.click(screen.getByText('量表来源与适用说明'));
    screen.getByRole('link', { name: '查看标准来源（新窗口）' }).focus();
    await user.tab();
    expect(screen.getByRole('button', { name: '结束并销毁答卷' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: '查看结果' })).toHaveFocus();
    await user.keyboard('{Enter}');
    const result = await screen.findByRole('region', { name: '体质测评结果' });
    expect(within(result).getByRole('heading', { name: '平和质' })).toHaveFocus();
    expect(within(result).getAllByRole('img')).toHaveLength(9);
    expect(within(result).getByRole('region', { name: '与运气互参' })).toHaveTextContent('未填写');
    expect(client.assessConstitution).toHaveBeenCalledExactlyOnceWith({ questionnaireId: questionnaire.id, sex: 'male', answers: { q1: 1, q2: 2, q3: 3, q4: 4, q5: 5, q6: 1, q7: 2, q8m: 3 } });
    expect(screen.queryByRole('button', { name: '更换' })).not.toBeInTheDocument();
    await user.click(screen.getByText('本次量表版本'));
    expect(screen.getByText('男性版 · GBT46939-2025 · test-1')).toBeVisible();
    expect(screen.getAllByText(/test-1/)).toHaveLength(1);
    await user.click(screen.getByText('量表来源与适用说明'));
    expect(screen.getByRole('link', { name: '查看标准来源（新窗口）' })).toHaveAttribute('href', questionnaire.sourceUrl);
    await user.click(screen.getByRole('button', { name: '返回修改' }));
    expect(screen.queryByRole('region', { name: '体质测评结果' })).not.toBeInTheDocument();
    expect(document.querySelector('.constitution-sex-summary')).toHaveTextContent('体质维度 · 男性版更换');
    expect(screen.getByRole('radio', { name: '3 有时（有些）' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: '上一题' }));
    expect(screen.getByRole('radio', { name: '2 很少（有一点）' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: '结束并销毁答卷' }));
    expect(screen.getByRole('radio', { name: '男' })).not.toBeChecked();
    expect(screen.getByRole('radiogroup', { name: '量表所用性别' })).toBeVisible();
  });

  it('uses focus-only arrows and explicit Space, Enter or digits to answer', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('radio', { name: '男' }));
    await user.tab();
    expect(screen.getByRole('radio', { name: '1 没有（根本不）' })).toHaveFocus();
    await user.keyboard('{ArrowDown}{End}{Home}{ArrowUp}');
    expect(screen.getByRole('radio', { name: '5 总是（非常）' })).toHaveFocus();
    expect(screen.getByRole('img', { name: /当前第 1 题/ })).toBeVisible();
    expect(screen.getByRole('img', { name: /已答 0/ })).toBeVisible();
    expect(within(screen.getByRole('radiogroup')).getAllByRole('radio', { checked: false })).toHaveLength(5);
    await user.keyboard(' ');
    expect(screen.getByRole('img', { name: /当前第 2 题/ })).toBeVisible();
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('img', { name: /当前第 3 题/ })).toBeVisible();
    await user.keyboard('{Control>}3{/Control}{Alt>}3{/Alt}{Meta>}3{/Meta}{Shift>}3{/Shift}x');
    expect(screen.getByRole('img', { name: /当前第 3 题/ })).toBeVisible();
    fireEvent.keyDown(screen.getByRole('heading', { name: '测试问题 3？' }), { key: '1', repeat: true });
    expect(screen.getByRole('img', { name: /当前第 3 题/ })).toBeVisible();
    await user.keyboard('4');
    expect(screen.getByRole('img', { name: /当前第 4 题/ })).toBeVisible();
  });

  it('holds the selection for 160ms, ignores rapid duplicate choices and cancels advancement on previous, sex change and unmount', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    const { unmount, client } = renderForm();
    fireEvent.click(screen.getByRole('radio', { name: '男' }));
    fireEvent.click(screen.getByRole('radio', { name: '3 有时（有些）' }));
    fireEvent.click(screen.getByRole('radio', { name: '5 总是（非常）' }));
    expect(screen.getByRole('radio', { name: '3 有时（有些）' })).toBeChecked();
    act(() => { vi.advanceTimersByTime(159); });
    expect(screen.getByRole('img', { name: /当前第 1 题/ })).toBeVisible();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByRole('img', { name: /当前第 2 题/ })).toBeVisible();
    fireEvent.click(screen.getByRole('radio', { name: '1 没有（根本不）' }));
    fireEvent.click(screen.getByRole('button', { name: '上一题' }));
    act(() => { vi.advanceTimersByTime(160); });
    expect(screen.getByRole('img', { name: /当前第 1 题/ })).toBeVisible();
    expect(screen.getByRole('radio', { name: '3 有时（有些）' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: '3 有时（有些）' }));
    fireEvent.click(screen.getByRole('button', { name: '更换' }));
    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    fireEvent.click(screen.getByRole('radio', { name: '女' }));
    act(() => { vi.advanceTimersByTime(160); });
    expect(screen.getByRole('img', { name: /已答 0/ })).toBeVisible();
    expect(screen.getByRole('img', { name: /当前第 1 题/ })).toBeVisible();
    fireEvent.click(screen.getByRole('radio', { name: '1 没有（根本不）' }));
    unmount();
    // Query's gcTime:0 also queues a cleanup; only the advance timer must be gone.
    act(() => { vi.advanceTimersByTime(0); });
    expect(vi.getTimerCount()).toBe(0);
    expect(client.assessConstitution).not.toHaveBeenCalled();
  });

  it('does not pull focus back to the next question when focus left the form during the 160ms hold', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    renderForm();
    const outside = document.createElement('button');
    document.body.append(outside);
    fireEvent.click(screen.getByRole('radio', { name: '男' }));
    fireEvent.click(screen.getByRole('radio', { name: '3 有时（有些）' }));
    act(() => { outside.focus(); vi.advanceTimersByTime(160); });
    expect(screen.getByRole('img', { name: /当前第 2 题/ })).toBeVisible();
    expect(outside).toHaveFocus();
    screen.getByRole('radio', { name: '3 有时（有些）' }).focus();
    fireEvent.click(screen.getByRole('radio', { name: '3 有时（有些）' }));
    act(() => { vi.advanceTimersByTime(160); });
    expect(screen.getByRole('img', { name: /当前第 3 题/ })).toBeVisible();
    expect(document.querySelector('.constitution-question-title')).toHaveFocus();
    outside.remove();
  });

  it('clears answers and results on sex change and sends only the applicable item', async () => {
    const user = userEvent.setup();
    const { client } = renderForm();
    await complete(user);
    await user.click(screen.getByRole('button', { name: '查看结果' }));
    await screen.findByRole('region', { name: '体质测评结果' });
    expect(screen.queryByRole('button', { name: '更换' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '返回修改' }));
    expect(screen.getByRole('radio', { name: '3 有时（有些）' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: '更换' }));
    expect(screen.getByRole('group', { name: '更换将清空已作答的 8 题' })).toBeVisible();
    expect(screen.queryByRole('region', { name: '体质测评结果' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认' }));
    expect(screen.queryByRole('img', { name: /已答/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '女' }));
    expect(screen.queryByRole('region', { name: '体质测评结果' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /已答 0/ })).toBeVisible();
    expect(within(screen.getByRole('radiogroup')).getAllByRole('radio', { checked: false })).toHaveLength(5);
    for (let index = 0; index < 8; index += 1) await user.keyboard(String(index % 5 + 1));
    expect(screen.getByRole('img', { name: /已答 8/ })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '返回修改' }));
    expect(screen.getByRole('heading', { name: '女性适用测试问题？' })).toBeVisible();
    expect(screen.queryByText('男性适用测试问题？')).not.toBeInTheDocument();
    await user.keyboard('5');
    await user.click(screen.getByRole('button', { name: '查看结果' }));
    await screen.findByRole('region', { name: '体质测评结果' });
    expect(client.assessConstitution).toHaveBeenLastCalledWith({ questionnaireId: 'GBT46939-2025', sex: 'female', answers: { q1: 1, q2: 2, q3: 3, q4: 4, q5: 5, q6: 1, q7: 2, q8f: 5 } });
  });

  it('blocks duplicate scoring, disables edits while pending and recovers from a sanitized error', async () => {
    const user = userEvent.setup();
    let reject!: (reason: unknown) => void;
    const client = createClientStub({ assessConstitution: vi.fn().mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; })).mockResolvedValueOnce(createAssessmentDto()) });
    renderForm(client);
    await complete(user);
    fireEvent.submit(screen.getByRole('form'));
    fireEvent.submit(screen.getByRole('form'));
    await waitFor(() => expect(client.assessConstitution).toHaveBeenCalledOnce());
    expect(screen.getByRole('status')).toHaveTextContent('正在按量表规则计分');
    expect(screen.getByRole('button', { name: '更换' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '返回修改' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '结束并销毁答卷' })).toBeEnabled();
    await act(async () => { reject(new Error('raw server failure')); });
    expect(await screen.findByRole('alert')).toHaveTextContent('测评暂未完成');
    expect(screen.queryByText(/raw server/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查看结果' }));
    expect(await screen.findByRole('region', { name: '体质测评结果' })).toBeVisible();
    expect(client.assessConstitution).toHaveBeenCalledTimes(2);
  });

  it('discards a late score when ending the standalone session', async () => {
    const user = userEvent.setup();
    let resolve!: (value: ReturnType<typeof createAssessmentDto>) => void;
    const client = createClientStub({ assessConstitution: vi.fn(() => new Promise<ReturnType<typeof createAssessmentDto>>((done) => { resolve = done; })) });
    renderForm(client);
    await complete(user);
    await user.click(screen.getByRole('button', { name: '查看结果' }));
    await user.click(screen.getByRole('button', { name: '结束并销毁答卷' }));
    await user.click(screen.getByRole('radio', { name: '女' }));
    await act(async () => { resolve(createAssessmentDto()); });
    expect(screen.queryByRole('region', { name: '体质测评结果' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /已答 0/ })).toBeVisible();
    expect(screen.getByRole('img', { name: /当前第 1 题/ })).toBeVisible();
  });

  it('confirms before clearing, cancels with a button or Esc, and restores focus and the same answers', async () => {
    const user = userEvent.setup();
    const { client } = renderForm();
    await user.click(screen.getByRole('radio', { name: '男' }));
    await user.keyboard('3');
    const change = screen.getByRole('button', { name: '更换' });
    for (const cancel of ['button', 'Escape']) {
      await user.click(change);
      expect(screen.getByRole('group', { name: '更换将清空已作答的 1 题' })).toBeVisible();
      expect(screen.getByRole('button', { name: '取消' })).toHaveFocus();
      fireEvent.submit(screen.getByRole('form'));
      expect(client.assessConstitution).not.toHaveBeenCalled();
      if (cancel === 'button') await user.click(screen.getByRole('button', { name: '取消' }));
      else await user.keyboard('{Escape}');
      expect(change).toHaveFocus();
      expect(screen.queryByRole('button', { name: '确认' })).not.toBeInTheDocument();
      expect(screen.getByRole('img', { name: /当前第 2 题/ })).toBeVisible();
      expect(screen.getByRole('img', { name: /已答 1/ })).toBeVisible();
    }
    await user.click(screen.getByRole('button', { name: '上一题' }));
    expect(screen.getByRole('radio', { name: '3 有时（有些）' })).toBeChecked();
    await user.click(change);
    await user.click(screen.getByRole('button', { name: '确认' }));
    expect(screen.getByRole('radio', { name: '男' })).toHaveFocus();
    expect(screen.queryByRole('img', { name: /已答/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '女' }));
    expect(screen.getByRole('img', { name: /已答 0/ })).toBeVisible();
    expect(document.querySelector('.constitution-sex-summary')).toHaveTextContent('体质维度 · 女性版更换');
    expect(document.querySelector('input[type="radio"]')).toBeNull();
  });

  it('returns directly to gender selection with no confirmation before any answer exists', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('radio', { name: '女' }));
    await user.click(screen.getByRole('button', { name: '更换' }));
    expect(screen.queryByRole('button', { name: '确认' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '男' })).toHaveFocus();
    expect(screen.getAllByRole('radio', { checked: false })).toHaveLength(2);
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('heading', { name: '测试问题 1？' })).toHaveFocus();
    expect(screen.getByRole('img', { name: /已答 0/ })).toBeVisible();
  });
});
