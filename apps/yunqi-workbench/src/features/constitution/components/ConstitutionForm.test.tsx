import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAssessmentDto, createClientStub, createLearningDto, createQuestionnaireDto } from '../../../test/learning-fixtures';
import { createTestWrapper } from '../../../test/test-utils';
import { mapConstitutionContext, mapQuestionnaire } from '../presentation/map-constitution';
import { mapLearning } from '../../yunqi/presentation/map-learning';
import { ConstitutionForm, ANSWER_HOLD_MS } from './ConstitutionForm';
import { answerByKey } from '../../../test/constitution-input';

function renderForm(client = createClientStub()) {
  const questionnaire = mapQuestionnaire(createQuestionnaireDto());
  return { ...render(<ConstitutionForm questionnaire={questionnaire} />, { wrapper: createTestWrapper(client, '/yunqi/constitution') }), client, questionnaire };
}

async function complete(user: ReturnType<typeof userEvent.setup>, sex = '男') {
  await user.click(screen.getByRole('radio', { name: sex + '性量表' }));
  for (let index = 1; index <= 8; index += 1) {
    expect(screen.getByRole('img', { name: new RegExp(`当前第 ${index} 题`) })).toBeVisible();
    await answerByKey(user, String((index - 1) % 5 + 1));
  }
  expect(screen.queryByRole('button', { name: '查看结果' })).not.toBeInTheDocument();
}

beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime }); vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true }))); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); localStorage.removeItem('yunqi-motion'); Reflect.deleteProperty(HTMLElement.prototype, 'animate'); });

describe('ConstitutionForm', () => {
  it.each(['full', 'reduced', 'off'])('keeps one accessible question and progress when immediately reopening after destruction in %s', (level) => {
    vi.stubGlobal('CSS', { supports: () => true });
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    localStorage.setItem('yunqi-motion', level);
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: vi.fn() });
    renderForm();
    document.querySelector<HTMLElement>('.theme-root')!.style.setProperty('--motion-fast', '120ms');
    fireEvent.click(screen.getByRole('radio', { name: '男性量表' }));
    fireEvent.keyDown(screen.getByRole('heading', { name: '测试问题 1？' }), { key: '1' });
    act(() => { vi.advanceTimersByTime(ANSWER_HOLD_MS); });
    fireEvent.click(screen.getByRole('button', { name: '结束并销毁' }));
    fireEvent.click(screen.getByRole('button', { name: '确认销毁' }));
    const copy = document.querySelector('.constitution-destroy-ghost');
    if (level === 'off') expect(copy).toBeNull();
    else {
      expect(copy).toHaveAttribute('aria-hidden', 'true');
      expect(copy).toHaveAttribute('inert');
      expect(copy!.querySelector('[id], [aria-live], [tabindex], [role], [aria-label]')).toBeNull();
    }
    fireEvent.click(screen.getByRole('radio', { name: '男性量表' }));
    expect(screen.getAllByRole('heading', { name: /测试问题 \d+？/ })).toHaveLength(1);
    expect(screen.getAllByRole('img', { name: /当前第 .* 题/ })).toHaveLength(1);
    expect(screen.getByRole('img', { name: /当前第 1 题/ })).toHaveTextContent('已答 0 / 8');
    expect(screen.getByRole('form').querySelectorAll('.constitution-position')).toHaveLength(1);
    act(() => { vi.advanceTimersByTime(120); });
    expect(document.querySelector('.constitution-destroy-ghost')).toBeNull();
  });

  it.each(['full', 'reduced', 'off'])('keeps the 240ms hold and immediate selection in %s, including a keyboard reselection', (level) => {
    vi.stubGlobal('CSS', { supports: () => true });
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    localStorage.setItem('yunqi-motion', level);
    renderForm();
    expect(document.querySelector('.theme-root')).toHaveAttribute('data-motion', level);
    expect(ANSWER_HOLD_MS).toBe(240);
    fireEvent.click(screen.getByRole('radio', { name: '男性量表' }));
    const heading = screen.getByRole('heading', { name: '测试问题 1？' });
    fireEvent.keyDown(heading, { key: '1' });
    expect(screen.getByRole('radio', { name: '1 没有（根本不）' })).toBeChecked();
    act(() => { vi.advanceTimersByTime(239); });
    expect(heading).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 3 })).toEqual([heading]);
    expect(screen.getAllByRole('img', { name: /当前第 .* 题/ })).toHaveLength(1);
    fireEvent.keyDown(heading, { key: '5' });
    expect(screen.getByRole('radio', { name: '5 总是（非常）' })).toBeChecked();
    act(() => { vi.advanceTimersByTime(239); });
    expect(heading).toBeVisible();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByRole('heading', { name: '测试问题 2？' })).toHaveFocus();
    expect(heading).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
    expect(screen.getAllByRole('img', { name: /当前第 .* 题/ })).toHaveLength(1);
    expect(screen.getAllByRole('radiogroup')).toHaveLength(1);
    expect(document.querySelector('.constitution-question-screen')).toHaveAttribute('data-direction', 'forward');
  });

  it.each(['ArrowLeft', 'Backspace'])('returns with %s from the question or an option, cancels the hold and keeps the answer', (key) => {
    renderForm();
    fireEvent.click(screen.getByRole('radio', { name: '男性量表' }));
    fireEvent.keyDown(screen.getByRole('heading', { name: '测试问题 1？' }), { key: '4' });
    act(() => { vi.advanceTimersByTime(ANSWER_HOLD_MS); });
    fireEvent.click(screen.getByRole('radio', { name: '2 很少（有一点）' }));
    fireEvent.keyDown(screen.getByRole('radio', { name: '2 很少（有一点）' }), { key });
    expect(screen.getByRole('heading', { name: '测试问题 1？' })).toHaveFocus();
    expect(document.querySelector('.constitution-question-screen')).toHaveAttribute('data-direction', 'backward');
    expect(screen.getByRole('radio', { name: '4 经常（相当）' })).toBeChecked();
    act(() => { vi.advanceTimersByTime(ANSWER_HOLD_MS); });
    expect(screen.getByRole('heading', { name: '测试问题 1？' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('heading', { name: '测试问题 1？' }), { key });
    expect(screen.getByRole('heading', { name: '测试问题 1？' })).toBeVisible();
  });

  it('leaves editable targets, modified shortcuts, repeated keys and prevented events untouched', () => {
    renderForm();
    fireEvent.click(screen.getByRole('radio', { name: '男性量表' }));
    fireEvent.keyDown(screen.getByRole('heading', { name: '测试问题 1？' }), { key: '1' });
    act(() => { vi.advanceTimersByTime(ANSWER_HOLD_MS); });
    const screenElement = document.querySelector('.constitution-question-screen')!;
    for (const element of [document.createElement('input'), document.createElement('textarea'), document.createElement('select'), document.createElement('div'), document.createElement('div')]) {
      if (element.tagName === 'DIV') element.setAttribute('contenteditable', 'true');
      screenElement.append(element);
      element.focus();
      for (const key of ['ArrowLeft', 'Backspace', '3']) expect(fireEvent.keyDown(element, { key })).toBe(true);
      expect(screen.getByRole('heading', { name: '测试问题 2？' })).toBeVisible();
      element.remove();
    }
    const heading = screen.getByRole('heading', { name: '测试问题 2？' });
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey', 'repeat']) {
      expect(fireEvent.keyDown(heading, { key: 'ArrowLeft', [modifier]: true })).toBe(true);
      expect(fireEvent.keyDown(heading, { key: 'Backspace', [modifier]: true })).toBe(true);
    }
    expect(heading).toBeVisible();
    expect(screen.getByRole('img', { name: /已答 1/ })).toBeVisible();
  });

  it('cancels with Escape or button and returns directly to the edition selector after confirmed destruction', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderForm();
    await user.click(screen.getByRole('radio', { name: '男性量表' }));
    await answerByKey(user, '3');
    for (const cancel of ['Escape', 'button']) {
      await user.click(screen.getByRole('button', { name: '结束并销毁' }));
      expect(screen.getByRole('button', { name: '取消' })).toHaveFocus();
      fireEvent.submit(screen.getByRole('form'));
      if (cancel === 'Escape') await user.keyboard('{Escape}');
      else await user.click(screen.getByRole('button', { name: '取消' }));
      expect(screen.getByRole('button', { name: '结束并销毁' })).toHaveFocus();
      expect(screen.getByRole('img', { name: /已答 1/ })).toBeVisible();
    }
    await user.click(screen.getByRole('button', { name: '结束并销毁' }));
    await user.click(screen.getByRole('button', { name: '确认销毁' }));
    expect(screen.getByRole('radio', { name: '男性量表' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: '男性量表' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: '女性量表' })).not.toBeChecked();
    expect(screen.queryByText('答卷已销毁')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('accepts one option click during destroy confirmation, including the final scoring answer', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { client } = renderForm();
    await user.click(screen.getByRole('radio', { name: '男性量表' }));
    for (let i = 0; i < 7; i++) await answerByKey(user, '1');
    await user.click(screen.getByRole('button', { name: '结束并销毁' }));
    const option = screen.getByRole('radio', { name: '3 有时（有些）' });
    await user.click(option);
    expect(option).toBeChecked();
    expect(option).toHaveFocus();
    expect(screen.queryByRole('button', { name: '确认销毁' })).not.toBeInTheDocument();
    expect(client.assessConstitution).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(ANSWER_HOLD_MS); });
    await screen.findByRole('region', { name: '体质测评结果' });
    expect(client.assessConstitution).toHaveBeenCalledTimes(1);
    expect(client.assessConstitution).toHaveBeenCalledWith(expect.objectContaining({ answers: expect.objectContaining({ q8m: 3 }) }));
  });

  it('orders the shared disclosures and moves the readonly assessment version into the source first line', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const dto = { ...createAssessmentDto(), sex: 'female' as const };
    const client = createClientStub({ assessConstitution: vi.fn().mockResolvedValue(dto) });
    const questionnaire = mapQuestionnaire(createQuestionnaireDto());
    render(<ConstitutionForm questionnaire={questionnaire} context={mapConstitutionContext(mapLearning(createLearningDto()))} />,
      { wrapper: createTestWrapper(client, '/yunqi/constitution') });
    const summaries = () => [...document.querySelectorAll('.constitution-notes > details > summary')].map((summary) => summary.textContent);
    expect(summaries()).toEqual(['量表来源与适用说明', '精确时刻', '本次对照快照与候选区间']);
    await user.click(screen.getByText('本次对照快照与候选区间'));
    expect(screen.getByText('尚未填写先天对照，暂无出生候选区间。')).toBeVisible();
    await user.click(screen.getByText('量表来源与适用说明'));
    expect(document.querySelector('.constitution-source > p')).toHaveTextContent(`${questionnaire.title} · ${questionnaire.version}`);
    await complete(user, '女');
    await screen.findByRole('region', { name: '体质测评结果' });
    expect(summaries()).toEqual(['判定说明与边界', '量表来源与适用说明', '精确时刻']);
    expect(screen.queryByText('本次量表版本')).not.toBeInTheDocument();
    await user.click(screen.getByText('量表来源与适用说明'));
    const version = screen.getByText(`女性版 · ${dto.questionnaireId} · ${dto.version}`);
    expect(version).toBeVisible();
    expect(version).toBe(document.querySelector('.constitution-source > p'));
    expect(screen.getAllByText(/女性版/)).toHaveLength(1);
    expect(screen.getByRole('link', { name: '查看标准来源（新窗口）' })).toHaveAttribute('href', questionnaire.sourceUrl);
  });

  it('combines the context and nine dimensions, counts shared answers, and keeps only the question and hint in the header', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderForm();
    await user.click(screen.getByRole('radio', { name: '男性量表' }));
    const context = screen.getByRole('complementary', { name: '本次测评对照背景' });
    const progress = within(context).getByRole('list', { name: '九种体质作答进度' });
    expect(within(progress).getAllByRole('listitem')).toHaveLength(9);
    const current = () => [...progress.querySelectorAll('[data-current="true"] .constitution-dimension-name')].map((node) => node.textContent);
    expect(current()).toEqual(['平和', '气虚']);
    expect(document.querySelector('.constitution-question-header')).toHaveTextContent('测试问题 1？请患者根据近一年的体验和感觉作答 · 数字键 1–5 · ← 上一题');
    expect(document.querySelector('.constitution-question-header')).not.toHaveTextContent(/体质量表|男性版|0\s*\/\s*8/);
    await answerByKey(user, '1');
    expect(current()).toEqual(['平和', '阳虚']);
    expect(within(progress).getByRole('img', { name: '平和质：1/2，当前题所属维度' })).toHaveStyle({ '--constitution-progress': '50%' });
    expect(within(progress).getByRole('img', { name: '气虚质：1/2' })).toHaveStyle({ '--constitution-progress': '50%' });
    await answerByKey(user, '2');
    expect(within(context).getByRole('img', { name: '已答 2 / 8 题，当前第 3 题' })).toHaveTextContent('已答 2 / 8');
    expect(within(progress).getByRole('img', { name: '平和质：2/2，全部答完' }).closest('[role="listitem"]')).toHaveTextContent('✓');
    await user.click(screen.getByRole('button', { name: '上一题' }));
    expect(current()).toEqual(['平和', '阳虚']);
    expect(within(context).getByRole('img', { name: '已答 2 / 8 题，当前第 2 题' })).toBeVisible();
    const notes = document.querySelector('.constitution-notes')!;
    expect(within(notes as HTMLElement).getByText('量表来源与适用说明')).toBeVisible();
  });

  it('keeps the destroy action beside Previous while answering and in the shell with the result', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderForm();
    const destroy = () => screen.queryAllByRole('button', { name: '结束并销毁' });
    expect(destroy()).toHaveLength(0);
    expect(document.querySelector('footer.constitution-session-footer')).toHaveTextContent('答卷仅存本次会话，不入库 · 结束即销毁');
    await user.click(screen.getByRole('radio', { name: '男性量表' }));
    expect(document.querySelector('.constitution-session-footer')).not.toBeInTheDocument();
    expect(destroy()).toHaveLength(1);
    expect(destroy()[0].closest('.constitution-actions')).toContainElement(screen.getByRole('button', { name: '上一题' }));
    expect(document.querySelector('.constitution-progress-header')).toHaveTextContent('体质维度 · 男性版更换已答 0 / 8');
    await answerByKey(user, '1');
    expect(destroy()).toHaveLength(1);
    expect(destroy()[0]).toHaveClass('ds-button--secondary');
    await user.click(destroy()[0]);
    await user.click(screen.getByRole('button', { name: '确认销毁' }));
    expect(destroy()).toHaveLength(0);
    expect(screen.getByRole('radiogroup', { name: '量表所用性别' })).toBeVisible();
    await complete(user);
    expect(destroy()).toHaveLength(1);
    expect(screen.queryByRole('button', { name: '查看结果' })).not.toBeInTheDocument();
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
    await answerByKey(user, '3');
    await screen.findByRole('region', { name: '体质测评结果' });
    await user.click(screen.getByRole('button', { name: '返回修改' }));
    await user.click(screen.getByRole('button', { name: '更换' }));
    await user.click(screen.getByRole('button', { name: '确认' }));
    await user.click(screen.getByRole('radio', { name: '女性量表' }));
    expect(destroy()).toHaveLength(1);
    expect(screen.queryByRole('region', { name: '体质测评结果' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /已答 0/ })).toBeVisible();
  });

  it('starts unanswered, blocks partial scoring and completes a keyboard session with automatic scoring', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { client, questionnaire } = renderForm();
    expect(screen.getAllByRole('radio', { checked: false })).toHaveLength(2);
    fireEvent.submit(screen.getByRole('form'));
    expect(screen.getByRole('alert')).toHaveTextContent('请先选择量表所用性别');
    expect(screen.getByRole('group', { name: '选择量表所用性别以开始作答' })).toHaveFocus();
    await user.click(screen.getByRole('radio', { name: '男性量表' }));
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
      await answerByKey(user, String((index - 1) % 5 + 1));
    }
    expect(screen.queryByRole('button', { name: '查看结果' })).not.toBeInTheDocument();
    const result = await screen.findByRole('region', { name: '体质测评结果' });
    expect(within(result).getByRole('heading', { name: '平和质' })).toHaveFocus();
    expect(within(result).getAllByRole('img')).toHaveLength(9);
    expect(within(result).getByRole('region', { name: '与运气互参' })).toHaveTextContent('未填写');
    expect(client.assessConstitution).toHaveBeenCalledExactlyOnceWith({ questionnaireId: questionnaire.id, sex: 'male', answers: { q1: 1, q2: 2, q3: 3, q4: 4, q5: 5, q6: 1, q7: 2, q8m: 3 } });
    expect(screen.queryByRole('button', { name: '更换' })).not.toBeInTheDocument();
    await user.click(screen.getByText('量表来源与适用说明'));
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
    await user.click(screen.getByRole('button', { name: '结束并销毁' }));
    await user.click(screen.getByRole('button', { name: '确认销毁' }));
    expect(screen.getByRole('radio', { name: '男性量表' })).not.toBeChecked();
    expect(screen.getByRole('radiogroup', { name: '量表所用性别' })).toBeVisible();
  });

  it('uses focus-only arrows and explicit Space, Enter or digits to answer', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderForm();
    await user.click(screen.getByRole('radio', { name: '男性量表' }));
    await user.tab();
    expect(screen.getByRole('radio', { name: '1 没有（根本不）' })).toHaveFocus();
    await user.keyboard('{ArrowDown}{End}{Home}{ArrowUp}');
    expect(screen.getByRole('radio', { name: '5 总是（非常）' })).toHaveFocus();
    expect(screen.getByRole('img', { name: /当前第 1 题/ })).toBeVisible();
    expect(screen.getByRole('img', { name: /已答 0/ })).toBeVisible();
    expect(within(screen.getByRole('radiogroup')).getAllByRole('radio', { checked: false })).toHaveLength(5);
    await answerByKey(user, ' ');
    expect(screen.getByRole('img', { name: /当前第 2 题/ })).toBeVisible();
    await user.tab();
    await answerByKey(user, '{Enter}');
    expect(screen.getByRole('img', { name: /当前第 3 题/ })).toBeVisible();
    await user.keyboard('{Control>}3{/Control}{Alt>}3{/Alt}{Meta>}3{/Meta}{Shift>}3{/Shift}x');
    expect(screen.getByRole('img', { name: /当前第 3 题/ })).toBeVisible();
    fireEvent.keyDown(screen.getByRole('heading', { name: '测试问题 3？' }), { key: '1', repeat: true });
    expect(screen.getByRole('img', { name: /当前第 3 题/ })).toBeVisible();
    await answerByKey(user, '4');
    expect(screen.getByRole('img', { name: /当前第 4 题/ })).toBeVisible();
  });

  it('holds the latest choice for 240ms, restarts the hold on reselection and cancels advancement on previous, sex change and unmount', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    const { unmount, client } = renderForm();
    fireEvent.click(screen.getByRole('radio', { name: '男性量表' }));
    fireEvent.click(screen.getByRole('radio', { name: '3 有时（有些）' }));
    act(() => { vi.advanceTimersByTime(ANSWER_HOLD_MS - 1); });
    fireEvent.click(screen.getByRole('radio', { name: '5 总是（非常）' }));
    expect(screen.getByRole('radio', { name: '5 总是（非常）' })).toBeChecked();
    act(() => { vi.advanceTimersByTime(ANSWER_HOLD_MS - 1); });
    expect(screen.getByRole('img', { name: /当前第 1 题/ })).toBeVisible();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByRole('img', { name: /当前第 2 题/ })).toBeVisible();
    fireEvent.click(screen.getByRole('radio', { name: '1 没有（根本不）' }));
    fireEvent.click(screen.getByRole('button', { name: '上一题' }));
    act(() => { vi.advanceTimersByTime(ANSWER_HOLD_MS); });
    expect(screen.getByRole('img', { name: /当前第 1 题/ })).toBeVisible();
    expect(screen.getByRole('radio', { name: '5 总是（非常）' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: '3 有时（有些）' }));
    fireEvent.click(screen.getByRole('button', { name: '更换' }));
    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    fireEvent.click(screen.getByRole('radio', { name: '女性量表' }));
    act(() => { vi.advanceTimersByTime(ANSWER_HOLD_MS); });
    expect(screen.getByRole('img', { name: /已答 0/ })).toBeVisible();
    expect(screen.getByRole('img', { name: /当前第 1 题/ })).toBeVisible();
    fireEvent.click(screen.getByRole('radio', { name: '1 没有（根本不）' }));
    unmount();
    // Query's gcTime:0 also queues a cleanup; only the advance timer must be gone.
    act(() => { vi.advanceTimersByTime(0); });
    expect(vi.getTimerCount()).toBe(0);
    expect(client.assessConstitution).not.toHaveBeenCalled();
  });

  it('does not pull focus back to the next question when focus left the form during the 240ms hold', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    renderForm();
    const outside = document.createElement('button');
    document.body.append(outside);
    fireEvent.click(screen.getByRole('radio', { name: '男性量表' }));
    fireEvent.click(screen.getByRole('radio', { name: '3 有时（有些）' }));
    act(() => { outside.focus(); vi.advanceTimersByTime(ANSWER_HOLD_MS); });
    expect(screen.getByRole('img', { name: /当前第 2 题/ })).toBeVisible();
    expect(outside).toHaveFocus();
    screen.getByRole('radio', { name: '3 有时（有些）' }).focus();
    fireEvent.click(screen.getByRole('radio', { name: '3 有时（有些）' }));
    act(() => { vi.advanceTimersByTime(ANSWER_HOLD_MS); });
    expect(screen.getByRole('img', { name: /当前第 3 题/ })).toBeVisible();
    expect(document.querySelector('.constitution-question-title')).toHaveFocus();
    for (let index = 3; index <= 8; index += 1) {
      fireEvent.keyDown(document.querySelector('.constitution-question-title')!, { key: '1' });
      if (index === 8) outside.focus();
      act(() => { vi.advanceTimersByTime(ANSWER_HOLD_MS); });
    }
    await screen.findByRole('region', { name: '体质测评结果' });
    expect(outside).toHaveFocus();
    outside.remove();
  });

  it('clears answers and results on sex change and sends only the applicable item', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { client } = renderForm();
    await complete(user);
    await screen.findByRole('region', { name: '体质测评结果' });
    expect(screen.queryByRole('button', { name: '更换' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '返回修改' }));
    expect(screen.getByRole('radio', { name: '3 有时（有些）' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: '更换' }));
    expect(screen.getByRole('group', { name: '更换将清空已作答的 8 题' })).toBeVisible();
    expect(screen.queryByRole('region', { name: '体质测评结果' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认' }));
    expect(screen.queryByRole('img', { name: /已答/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '女性量表' }));
    expect(screen.queryByRole('region', { name: '体质测评结果' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /已答 0/ })).toBeVisible();
    expect(within(screen.getByRole('radiogroup')).getAllByRole('radio', { checked: false })).toHaveLength(5);
    for (let index = 0; index < 8; index += 1) await answerByKey(user, String(index % 5 + 1));
    await screen.findByRole('region', { name: '体质测评结果' });
    await user.click(screen.getByRole('button', { name: '返回修改' }));
    expect(screen.getByRole('heading', { name: '女性适用测试问题？' })).toBeVisible();
    expect(screen.queryByText('男性适用测试问题？')).not.toBeInTheDocument();
    await answerByKey(user, '5');
    await screen.findByRole('region', { name: '体质测评结果' });
    expect(client.assessConstitution).toHaveBeenLastCalledWith({ questionnaireId: 'GBT46939-2025', sex: 'female', answers: { q1: 1, q2: 2, q3: 3, q4: 4, q5: 5, q6: 1, q7: 2, q8f: 5 } });
  });

  it('blocks duplicate scoring, disables edits while pending and recovers from a sanitized error', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let reject!: (reason: unknown) => void;
    const client = createClientStub({ assessConstitution: vi.fn().mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; })).mockResolvedValueOnce(createAssessmentDto()) });
    renderForm(client);
    await complete(user);
    fireEvent.submit(screen.getByRole('form'));
    fireEvent.submit(screen.getByRole('form'));
    await waitFor(() => expect(client.assessConstitution).toHaveBeenCalledOnce());
    expect(screen.getByRole('status')).toHaveTextContent('正在按量表规则计分');
    expect(screen.getByRole('button', { name: '更换' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '返回修改' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '结束并销毁' })).toBeEnabled();
    await act(async () => { reject(new Error('raw server failure')); });
    expect(await screen.findByRole('alert')).toHaveTextContent('测评暂未完成');
    expect(screen.queryByText(/raw server/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重新计分' }));
    expect(await screen.findByRole('region', { name: '体质测评结果' })).toBeVisible();
    expect(client.assessConstitution).toHaveBeenCalledTimes(2);
  });

  it('discards a late score when ending the standalone session', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let resolve!: (value: ReturnType<typeof createAssessmentDto>) => void;
    const client = createClientStub({ assessConstitution: vi.fn(() => new Promise<ReturnType<typeof createAssessmentDto>>((done) => { resolve = done; })) });
    renderForm(client);
    await complete(user);
    await user.click(screen.getByRole('button', { name: '结束并销毁' }));
    await user.click(screen.getByRole('button', { name: '确认销毁' }));
    await user.click(screen.getByRole('radio', { name: '女性量表' }));
    await act(async () => { resolve(createAssessmentDto()); });
    expect(screen.queryByRole('region', { name: '体质测评结果' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /已答 0/ })).toBeVisible();
    expect(screen.getByRole('img', { name: /当前第 1 题/ })).toBeVisible();
  });

  it('confirms before clearing, cancels with a button or Esc, and restores focus and the same answers', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { client } = renderForm();
    await user.click(screen.getByRole('radio', { name: '男性量表' }));
    await answerByKey(user, '3');
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
    expect(screen.getByRole('radio', { name: '男性量表' })).toHaveFocus();
    expect(screen.queryByRole('img', { name: /已答/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '女性量表' }));
    expect(screen.getByRole('img', { name: /已答 0/ })).toBeVisible();
    expect(document.querySelector('.constitution-sex-summary')).toHaveTextContent('体质维度 · 女性版更换');
    expect(document.querySelector('input[type="radio"]')).toBeNull();
  });

  it('returns directly to gender selection with no confirmation before any answer exists', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderForm();
    await user.click(screen.getByRole('radio', { name: '女性量表' }));
    await user.click(screen.getByRole('button', { name: '更换' }));
    expect(screen.queryByRole('button', { name: '确认' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '男性量表' })).toHaveFocus();
    expect(screen.getAllByRole('radio', { checked: false })).toHaveLength(2);
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('heading', { name: '测试问题 1？' })).toHaveFocus();
    expect(screen.getByRole('img', { name: /已答 0/ })).toBeVisible();
  });
});
