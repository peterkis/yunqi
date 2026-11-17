import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAssessmentDto, createClientStub, createQuestionnaireDto } from '../../../test/learning-fixtures';
import { createTestWrapper } from '../../../test/test-utils';
import { mapQuestionnaire } from '../presentation/map-constitution';
import { ConstitutionForm } from './ConstitutionForm';

function renderForm(client = createClientStub()) {
  const questionnaire = mapQuestionnaire(createQuestionnaireDto());
  return { ...render(<ConstitutionForm questionnaire={questionnaire} />, { wrapper: createTestWrapper(client) }), client, questionnaire };
}

async function complete(user: ReturnType<typeof userEvent.setup>, sex = '男') {
  await user.click(screen.getByRole('radio', { name: sex }));
  for (let index = 1; index <= 8; index += 1) {
    expect(screen.getByText(`${index}/8`)).toBeVisible();
    await user.keyboard(String((index - 1) % 5 + 1));
  }
  expect(screen.getByRole('heading', { name: '8 题已全部作答' })).toHaveFocus();
  expect(screen.getByRole('button', { name: '查看结果' })).toHaveClass('ds-button--primary');
}

beforeEach(() => { vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true }))); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('ConstitutionForm', () => {
  it('shows one secondary destroy action only while answers or a result exist', async () => {
    const user = userEvent.setup();
    renderForm();
    const destroy = () => screen.queryAllByRole('button', { name: '结束并销毁答卷' });
    expect(destroy()).toHaveLength(0);
    expect(document.querySelector('footer.constitution-session-footer')).toHaveTextContent('答卷仅存本次会话，不入库 · 结束即销毁');
    await user.click(screen.getByRole('radio', { name: '男' }));
    expect(destroy()).toHaveLength(0);
    await user.keyboard('1');
    expect(destroy()).toHaveLength(1);
    expect(destroy()[0]).toHaveClass('ds-button--secondary');
    await user.click(destroy()[0]);
    expect(destroy()).toHaveLength(0);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    await complete(user);
    expect(destroy()).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: '查看结果' }));
    await screen.findByRole('region', { name: '体质测评结果' });
    expect(destroy()).toHaveLength(1);
    await user.click(screen.getByRole('radio', { name: '女' }));
    expect(destroy()).toHaveLength(0);
    expect(screen.queryByRole('region', { name: '体质测评结果' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /已答 0/ })).toBeVisible();
  });

  it('starts unanswered, blocks partial scoring and completes a keyboard session before an explicit submit', async () => {
    const user = userEvent.setup();
    const { client, questionnaire } = renderForm();
    expect(screen.getAllByRole('radio').every((radio) => !radio.hasAttribute('checked'))).toBe(true);
    fireEvent.submit(screen.getByRole('form'));
    expect(screen.getByRole('alert')).toHaveTextContent('请先选择量表所用性别');
    expect(screen.getByRole('group', { name: '量表所用性别' })).toHaveFocus();
    await user.click(screen.getByRole('radio', { name: '男' }));
    expect(screen.getByRole('img', { name: /已答 0 \/ 8/ })).toBeVisible();
    expect(screen.getAllByRole('radiogroup')).toHaveLength(1);
    expect(screen.getAllByRole('radio', { checked: false })).toHaveLength(6);
    expect(screen.getByRole('button', { name: '上一题' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '查看结果' })).not.toBeInTheDocument();
    fireEvent.submit(screen.getByRole('form'));
    expect(screen.getByRole('alert')).toHaveTextContent('还有 8 题未作答');
    expect(client.assessConstitution).not.toHaveBeenCalled();
    for (let index = 1; index <= 8; index += 1) {
      expect(screen.getByText(`${index}/8`)).toBeVisible();
      await user.keyboard(String((index - 1) % 5 + 1));
    }
    expect(screen.getByRole('heading', { name: '8 题已全部作答' })).toHaveFocus();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(client.assessConstitution).not.toHaveBeenCalled();
    await user.tab();
    expect(screen.getByRole('button', { name: '查看结果' })).toHaveFocus();
    await user.keyboard('{Enter}');
    const result = await screen.findByRole('region', { name: '体质测评结果' });
    expect(within(result).getByRole('heading', { name: '平和质' })).toHaveFocus();
    expect(within(result).getAllByRole('img')).toHaveLength(9);
    expect(within(result).getByRole('region', { name: '与运气互参' })).toHaveTextContent('未提供出生资料');
    expect(client.assessConstitution).toHaveBeenCalledExactlyOnceWith({ questionnaireId: questionnaire.id, sex: 'male', answers: { q1: 1, q2: 2, q3: 3, q4: 4, q5: 5, q6: 1, q7: 2, q8m: 3 } });
    await user.click(screen.getByText('本次量表版本'));
    expect(screen.getByText('GBT46939-2025 · test-1')).toBeVisible();
    await user.click(screen.getByText('量表来源与适用说明'));
    expect(screen.getByRole('link', { name: '查看标准来源（新窗口）' })).toHaveAttribute('href', questionnaire.sourceUrl);
    await user.click(screen.getByRole('button', { name: '返回修改' }));
    expect(screen.queryByRole('region', { name: '体质测评结果' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '有时' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: '上一题' }));
    expect(screen.getByRole('radio', { name: '很少' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: '结束并销毁答卷' }));
    expect(screen.getByRole('radio', { name: '男' })).not.toBeChecked();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('uses focus-only arrows and explicit Space, Enter or digits to answer', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('radio', { name: '男' }));
    await user.tab();
    expect(screen.getByRole('radio', { name: '没有' })).toHaveFocus();
    await user.keyboard('{ArrowDown}{End}{Home}{ArrowUp}');
    expect(screen.getByRole('radio', { name: '总是' })).toHaveFocus();
    expect(screen.getByText('1/8')).toBeVisible();
    expect(screen.getByRole('img', { name: /已答 0/ })).toBeVisible();
    expect(within(screen.getByRole('radiogroup')).getAllByRole('radio', { checked: false })).toHaveLength(5);
    await user.keyboard(' ');
    expect(screen.getByText('2/8')).toBeVisible();
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByText('3/8')).toBeVisible();
    await user.keyboard('{Control>}3{/Control}{Alt>}3{/Alt}{Meta>}3{/Meta}{Shift>}3{/Shift}x');
    expect(screen.getByText('3/8')).toBeVisible();
    fireEvent.keyDown(screen.getByRole('heading', { name: '测试问题 3？' }), { key: '1', repeat: true });
    expect(screen.getByText('3/8')).toBeVisible();
    await user.keyboard('4');
    expect(screen.getByText('4/8')).toBeVisible();
  });

  it('holds the selection for 160ms, ignores rapid duplicate choices and cancels advancement on previous, sex change and unmount', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    const { unmount, client } = renderForm();
    fireEvent.click(screen.getByRole('radio', { name: '男' }));
    fireEvent.click(screen.getByRole('radio', { name: '有时' }));
    fireEvent.click(screen.getByRole('radio', { name: '总是' }));
    expect(screen.getByRole('radio', { name: '有时' })).toBeChecked();
    act(() => { vi.advanceTimersByTime(159); });
    expect(screen.getByText('1/8')).toBeVisible();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByText('2/8')).toBeVisible();
    fireEvent.click(screen.getByRole('radio', { name: '没有' }));
    fireEvent.click(screen.getByRole('button', { name: '上一题' }));
    act(() => { vi.advanceTimersByTime(160); });
    expect(screen.getByText('1/8')).toBeVisible();
    expect(screen.getByRole('radio', { name: '有时' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: '有时' }));
    fireEvent.click(screen.getByRole('radio', { name: '女' }));
    act(() => { vi.advanceTimersByTime(160); });
    expect(screen.getByRole('img', { name: /已答 0/ })).toBeVisible();
    expect(screen.getByText('1/8')).toBeVisible();
    fireEvent.click(screen.getByRole('radio', { name: '没有' }));
    unmount();
    // Query's gcTime:0 also queues a cleanup; only the advance timer must be gone.
    act(() => { vi.advanceTimersByTime(0); });
    expect(vi.getTimerCount()).toBe(0);
    expect(client.assessConstitution).not.toHaveBeenCalled();
  });

  it('clears answers and results on sex change and sends only the applicable item', async () => {
    const user = userEvent.setup();
    const { client } = renderForm();
    await complete(user);
    await user.click(screen.getByRole('button', { name: '查看结果' }));
    await screen.findByRole('region', { name: '体质测评结果' });
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
    expect(screen.getByRole('radio', { name: '女' })).toBeDisabled();
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
    expect(screen.getByText('1/8')).toBeVisible();
  });
});
