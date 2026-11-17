import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createLearningDto } from '../../../test/learning-fixtures';
import { mapLearning } from '../presentation/map-learning';
import { CurrentYunQiPage } from './CurrentYunQiPage';

function renderPage() {
  const dto = createLearningDto();
  const learning = mapLearning(dto);
  render(<CurrentYunQiPage viewModel={learning.facts} learning={learning} />, { wrapper: MemoryRouter });
  return { dto, learning };
}

describe('CurrentYunQiPage', () => {
  it('omits movement relation labels and placeholders when the API supplies no relation', () => {
    renderPage();
    const movement = screen.getByRole('region', { name: '当步运' });
    expect(movement).toHaveTextContent('火运太过（太徵）');
    expect(movement).toHaveTextContent('木运不及（少角）');
    expect(movement.querySelector('.ds-relation')).toBeNull();
    expect(movement).not.toHaveTextContent('关系未提供');
    expect(movement).not.toHaveTextContent('主运与客运并列展示。');
    expect(screen.getByRole('region', { name: '当步气' }).querySelector('.ds-relation__chip')).not.toBeNull();
  });

  it('renders a movement relation only when it is explicitly supplied in the view model', () => {
    const mapped = mapLearning(createLearningDto());
    const relation = { label: '测试关系', tone: 'neutral', explanation: '测试接口提供的关系说明。' } as const;
    const learning = { ...mapped, currentMovement: { ...mapped.currentMovement, relation } };
    render(<CurrentYunQiPage viewModel={learning.facts} learning={learning} />, { wrapper: MemoryRouter });
    const movement = screen.getByRole('region', { name: '当步运' });
    expect(within(movement).getByText(relation.label)).toHaveClass('ds-relation__chip--neutral');
    expect(within(movement).getByText(relation.explanation)).toBeVisible();
    expect(movement).not.toHaveTextContent('关系未提供');
  });

  it('shows annual and current facts, exact API times, mapped dots and relations before any disclosure', async () => {
    const { dto } = renderPage();
    const annual = screen.getByRole('region', { name: '全年 · 2026' });
    expect(within(annual).getByRole('heading', { name: '丙午' })).toBeVisible();
    expect(annual).toHaveTextContent('交运 2026-01-20 09:00:00');
    expect(annual).toHaveTextContent('水运太过之年');
    expect(within(annual).getByText('水运太过')).toBeVisible();
    expect(within(annual).getByText('太羽')).toBeVisible();
    expect(within(annual).getByText('少阳相火')).toBeVisible();
    expect(within(annual).getByText('厥阴风木')).toBeVisible();
    expect(annual.querySelectorAll('.ds-element__dot')).toHaveLength(3);
    expect(within(annual).getByText('不和')).toHaveClass('ds-relation__chip--adverse');
    expect(annual).toHaveTextContent(dto.annualRelation.relation);

    const now = screen.getByRole('region', { name: '此刻 · 2026-06-19' });
    expect(now).toHaveTextContent('北京时间 UTC+08');
    expect(within(now).getByText('2026-06-19 12:00:00')).toHaveAttribute('datetime', dto.facts.input.localTime);
    const progress = within(now).getByRole('img');
    expect(progress).toHaveAccessibleName('六步气进度：第1步初之气，已结束；第2步二之气，已结束；第3步三之气，当前；第4步四之气，未开始；第5步五之气，未开始；第6步终之气，未开始');
    expect(progress.children).toHaveLength(6);
    expect(progress.querySelectorAll('.is-completed')).toHaveLength(2);
    expect(progress.querySelectorAll('.is-current')).toHaveLength(1);
    const qi = within(now).getByRole('region', { name: '当步气' });
    expect(within(qi).getByRole('heading', { name: '三之气' })).toBeVisible();
    expect(qi.querySelectorAll('time')[0]).toHaveAttribute('datetime', dto.facts.currentStep.start.localTime);
    expect(qi.querySelectorAll('time')[1]).toHaveAttribute('datetime', dto.facts.currentStep.end.localTime);
    expect(within(qi).getByText('相得')).toHaveClass('ds-relation__chip--favorable');
    expect(qi).toHaveTextContent('客生主');
    const movement = within(now).getByRole('region', { name: '当步运' });
    expect(movement).toHaveTextContent('火运太过（太徵）');
    expect(movement).toHaveTextContent('木运不及（少角）');
    expect(movement.querySelectorAll('time')[0]).toHaveAttribute('datetime', dto.currentMovement.start.localTime);
    expect(movement.querySelectorAll('time')[1]).toHaveAttribute('datetime', dto.currentMovement.end.localTime);
    expect(now.textContent).not.toMatch(/还有\s*\d+\s*天/);
    expect(screen.getByRole('link', { name: '年度详情' })).toHaveAttribute('href', '/yunqi/year/2026');
    expect(screen.getByRole('link', { name: '指定时点' })).toHaveAttribute('href', '/yunqi/calculate');
    expect(screen.getByRole('link', { name: '原文与释义' })).toHaveAttribute('href', '/yunqi/current/classics');
    expect(screen.getByText('“主胜逆，客胜从。”')).toBeVisible();
    expect(screen.getByText('文献线索，非个体发病预测')).toBeVisible();
    expect(screen.getAllByText('文献线索，非个体发病预测')).toHaveLength(1);
  });

  it('keeps API explanations, sources, all stages and version trace reachable on demand', async () => {
    const user = userEvent.setup();
    const { dto } = renderPage();
    const reading = screen.getByText('这些关系怎么读？');
    expect(screen.getByText(dto.currentQi.explanation)).not.toBeVisible();
    // Native summary keyboard activation is covered in the real-browser flow.
    await user.click(reading);
    expect(screen.getByText(dto.currentQi.explanation)).toBeVisible();
    expect(screen.getByText(dto.annualRelation.explanation)).toBeVisible();
    expect(screen.getAllByRole('link', { name: /传统理论测试来源/ })[0]).toHaveAttribute('href', dto.annualRelation.sources[0].url);
    expect(within(reading.parentElement!).getByText(dto.currentMovement.explanation, { exact: true })).toBeVisible();

    expect(screen.getByRole('region', { name: '六步交接时间线' })).not.toBeVisible();
    const allStages = screen.getByText('其余阶段 · 六步气与五步运');
    await user.click(allStages);
    const timeline = screen.getByRole('region', { name: '六步交接时间线' });
    expect(within(timeline).getAllByRole('button', { name: /第 [1-6] 步/ })).toHaveLength(6);
    expect(within(timeline).getAllByRole('article')).toHaveLength(6);
    expect(within(timeline).getByRole('button', { name: '收起三之气详情' })).toHaveAttribute('aria-expanded', 'true');
    const currentDetails = within(timeline).getByRole('region', { name: '三之气详情' });
    expect(currentDetails).toHaveTextContent('客生主');
    expect(currentDetails).toHaveTextContent('客生主，相得');
    const movements = screen.getByRole('region', { name: '五步运全表' });
    expect(within(movements).getAllByRole('region')).toHaveLength(dto.movements.length);
    expect(movements).toHaveTextContent(dto.currentMovement.boundaryMethod);
    await user.click(allStages);
    expect(timeline).not.toBeVisible();

    await user.click(screen.getByText('计算说明与版本'));
    expect(screen.getByRole('region', { name: '规则结果说明' })).toHaveTextContent('本结果依据冻结规则计算。');
    const trace = screen.getByRole('region', { name: '追溯信息' });
    expect(trace).toHaveTextContent('YunQi 当前查询 API');
    expect(trace).toHaveTextContent('YQ-API-CONTRACT-1.2.0');
    expect(trace).toHaveTextContent('YQ-MVP-RULES-1.1.0');
    expect(trace).toHaveTextContent('北京时间 UTC+08');
  });

  it('keeps the original-text route reachable when no current excerpt was returned', () => {
    const learning = mapLearning({ ...createLearningDto(), currentPassages: [] });
    render(<CurrentYunQiPage viewModel={learning.facts} learning={learning} />, { wrapper: MemoryRouter });
    expect(screen.getByText('此范围暂未收录已核对原文。')).toBeVisible();
    expect(screen.getByRole('link', { name: '原文与释义' })).toHaveAttribute('href', '/yunqi/current/classics');
  });
});
