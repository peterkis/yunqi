import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createAssessmentDto, createClientStub, createQuestionnaireDto } from '../../../test/learning-fixtures';
import { createTestWrapper } from '../../../test/test-utils';
import { ConstitutionForm } from './ConstitutionForm';

async function answerVisible(user: ReturnType<typeof userEvent.setup>, label = '没有') {
  for (const fieldset of screen.getAllByRole('group').filter((group) => group.classList.contains('constitution-question'))) {
    await user.click(within(fieldset).getByRole('radio', { name: label }));
  }
}

describe('ConstitutionForm', () => {
  it('replaces the final next control without converting the clicked button into a submit control', async () => {
    const user = userEvent.setup();
    const client = createClientStub();
    render(<ConstitutionForm questionnaire={createQuestionnaireDto()} />, { wrapper: createTestWrapper(client) });
    await user.click(screen.getByRole('radio', { name: '男' }));
    const next = screen.getByRole('button', { name: '下一组' });
    expect(next).toHaveAttribute('type', 'button');

    await user.click(next);

    const submit = screen.getByRole('button', { name: '生成体质测评结果' });
    expect(submit).not.toBe(next);
    expect(next).not.toBeInTheDocument();
    expect(next).toHaveAttribute('type', 'button');
    expect(submit).toHaveAttribute('type', 'submit');
    expect(screen.getByRole('heading', { name: '第 2 组 / 共 2 组' })).toHaveFocus();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(client.assessConstitution).not.toHaveBeenCalled();

    await user.click(submit);

    expect(screen.getByRole('alert')).toHaveTextContent('还有 8 题未作答');
    expect(screen.getByRole('heading', { name: '第 1 组 / 共 2 组' })).toHaveFocus();
    expect(client.assessConstitution).not.toHaveBeenCalled();
  });

  it('starts unanswered, prevents partial scoring, submits applicable answers and presents all returned dimensions', async () => {
    const user = userEvent.setup();
    const questionnaire = createQuestionnaireDto();
    const client = createClientStub();
    render(<ConstitutionForm questionnaire={questionnaire} />, { wrapper: createTestWrapper(client) });
    expect(client.assessConstitution).not.toHaveBeenCalled();
    expect(screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked)).toBe(true);
    await user.click(screen.getByRole('radio', { name: '男' }));
    expect(screen.getByText('已答 0 / 8 题')).toBeVisible();
    expect(screen.getByRole('button', { name: '上一组' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '下一组' }));
    expect(screen.getByText('男性适用测试问题？')).toBeVisible();
    expect(screen.queryByText('女性适用测试问题？')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '生成体质测评结果' }));
    expect(screen.getByRole('alert')).toHaveTextContent('还有 8 题未作答');
    expect(screen.getByRole('heading', { name: '第 1 组 / 共 2 组' })).toHaveFocus();
    expect(client.assessConstitution).not.toHaveBeenCalled();
    await answerVisible(user);
    await user.click(screen.getByRole('button', { name: '下一组' }));
    await answerVisible(user, '有时');
    await user.click(screen.getByRole('button', { name: '生成体质测评结果' }));
    const result = await screen.findByRole('region', { name: '体质测评结果' });
    expect(within(result).getAllByRole('progressbar')).toHaveLength(9);
    expect(within(result).getByRole('heading', { name: '符合平和质判定条件' })).toBeVisible();
    expect(client.assessConstitution).toHaveBeenCalledExactlyOnceWith({
      questionnaireId: questionnaire.id,
      sex: 'male',
      answers: { q1: 1, q2: 1, q3: 1, q4: 1, q5: 1, q6: 1, q7: 3, q8m: 3 },
    });
    await user.click(screen.getByText('本次量表版本'));
    expect(screen.getByText('GBT46939-2025 · test-1')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '上一组' }));
    const firstQuestion = screen.getAllByRole('group').find((group) => group.classList.contains('constitution-question'))!;
    expect(within(firstQuestion).getByRole('radio', { name: '没有' })).toBeChecked();
    await user.click(within(firstQuestion).getByRole('radio', { name: '经常' }));
    expect(screen.queryByRole('region', { name: '体质测评结果' })).not.toBeInTheDocument();
    await user.click(screen.getByText('量表来源与适用说明'));
    expect(screen.getByRole('link', { name: '查看标准来源（新窗口）' })).toHaveAttribute('href', questionnaire.sourceUrl);
    await user.click(screen.getByRole('button', { name: '清空本次测评' }));
    expect(screen.getByRole('radio', { name: '男' })).not.toBeChecked();
    expect(screen.queryByText(/已答/)).not.toBeInTheDocument();
  });

  it('clears answers and results when sex changes and never sends the other sex item', async () => {
    const user = userEvent.setup();
    const client = createClientStub();
    render(<ConstitutionForm questionnaire={createQuestionnaireDto()} />, { wrapper: createTestWrapper(client) });
    await user.click(screen.getByRole('radio', { name: '男' }));
    await answerVisible(user);
    await user.click(screen.getByRole('button', { name: '下一组' }));
    await answerVisible(user);
    await user.click(screen.getByRole('button', { name: '生成体质测评结果' }));
    await screen.findByRole('region', { name: '体质测评结果' });
    await user.click(screen.getByRole('radio', { name: '女' }));
    expect(screen.getByText('已答 0 / 8 题')).toBeVisible();
    expect(screen.queryByRole('region', { name: '体质测评结果' })).not.toBeInTheDocument();
    await answerVisible(user);
    await user.click(screen.getByRole('button', { name: '下一组' }));
    expect(screen.getByText('女性适用测试问题？')).toBeVisible();
    await answerVisible(user);
    await user.click(screen.getByRole('button', { name: '生成体质测评结果' }));
    await screen.findByRole('region', { name: '体质测评结果' });
    expect(client.assessConstitution).toHaveBeenLastCalledWith({ questionnaireId: 'GBT46939-2025', sex: 'female', answers: { q1: 1, q2: 1, q3: 1, q4: 1, q5: 1, q6: 1, q7: 1, q8f: 1 } });
  });

  it('disables controls during scoring, rejects duplicate submits, then recovers from a sanitized error', async () => {
    const user = userEvent.setup();
    let reject!: (reason: unknown) => void;
    const client = createClientStub({ assessConstitution: vi.fn().mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; })).mockResolvedValueOnce(createAssessmentDto()) });
    render(<ConstitutionForm questionnaire={createQuestionnaireDto()} />, { wrapper: createTestWrapper(client) });
    await user.click(screen.getByRole('radio', { name: '男' }));
    await answerVisible(user);
    await user.click(screen.getByRole('button', { name: '下一组' }));
    await answerVisible(user);
    await user.click(screen.getByRole('button', { name: '生成体质测评结果' }));
    expect(screen.getByRole('status')).toHaveTextContent('正在按量表规则计分');
    expect(screen.getByRole('button', { name: '清空本次测评' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: '女' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: '中医体质量表' }));
    expect(client.assessConstitution).toHaveBeenCalledTimes(1);
    await act(async () => { reject(new Error('raw server failure')); });
    expect(await screen.findByRole('alert')).toHaveTextContent('测评暂未完成');
    expect(screen.queryByText(/raw server/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '生成体质测评结果' }));
    expect(await screen.findByRole('region', { name: '体质测评结果' })).toBeVisible();
    expect(client.assessConstitution).toHaveBeenCalledTimes(2);
  });

  it('requires sex even when a form is submitted from the keyboard before choosing', () => {
    const client = createClientStub();
    render(<ConstitutionForm questionnaire={createQuestionnaireDto()} />, { wrapper: createTestWrapper(client) });
    fireEvent.submit(screen.getByRole('form', { name: '中医体质量表' }));
    expect(screen.getByRole('alert')).toHaveTextContent('请先选择量表所用性别');
    expect(client.assessConstitution).not.toHaveBeenCalled();
  });
});
