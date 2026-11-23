import type { PropsWithChildren } from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createLearningDto } from '../../../test/learning-fixtures';
import { mapLearning } from '../presentation/map-learning';
import { CurrentYunQiPage } from './CurrentYunQiPage';
import { PanelShell } from '../../../components/layout/PanelShell';
import { ThemeProvider } from '../../../providers/ThemeProvider';
import { MotionProvider } from '../../../providers/MotionProvider';

function PageWrapper({ children }: PropsWithChildren) {
  return <MemoryRouter><MotionProvider>{children}</MotionProvider></MemoryRouter>;
}

function renderPage() {
  const dto = createLearningDto();
  const learning = mapLearning(dto);
  render(<CurrentYunQiPage viewModel={learning.facts} learning={learning} />, { wrapper: PageWrapper });
  return { dto, learning };
}

describe('CurrentYunQiPage', () => {
  it('aligns the two periods and nests the remaining-time labels in their titles', () => {
    const { learning } = renderPage();
    const qi = screen.getByRole('region', { name: '当步气' });
    const movement = screen.getByRole('region', { name: '当步运' });
    const grid = document.querySelector('.current-period-grid')!;
    const columns = [
      { region: qi, column: 1, title: '三之气', text: ['小满 → 大暑', `主气${learning.facts.currentStep.hostQi}`, `客气${learning.facts.currentStep.guestQi}`, '相得', '客生主'] },
      { region: movement, column: 3, title: '二之运', text: ['春分后13日 → 芒种后10日', '主运火运太过', '客运木运不及', '相得\u202f·\u202f客生主', '客木生主火'] },
    ];
    expect(grid.querySelectorAll('.current-period-cell')).toHaveLength(12);
    for (const { region, column, title, text } of columns) {
      expect(region.parentElement).toBe(grid);
      const cells = [...region.querySelectorAll('.current-period-cell')];
      expect(cells[0].querySelector('h3')).toHaveTextContent(title);
      expect(cells[0].querySelector('.current-period-cell--remaining')).toHaveTextContent('还有 34 天');
      expect(cells.slice(1).map((cell) => cell.textContent)).toEqual(text);
      for (const [index, cell] of cells.entries()) {
        expect(cell).toHaveStyle({ gridColumn: `${column}`, gridRow: `${index + 1}` });
      }
    }
    const page = grid.closest('.current-overview')!;
    expect([...page.children].filter((child) => child.matches('.current-overview__annual, .current-overview__now, .current-overview__quote, .current-more'))
      .map((child) => child.className)).toEqual(['current-overview__annual', 'current-overview__now', 'current-overview__quote', 'current-more']);
  });

  it('groups More rows outside the cards, with motion settings beside calculation details', () => {
    renderPage();
    const more = screen.getByRole('navigation', { name: '更多运气分析' });
    const rows = within(more).getAllByRole('listitem').filter((item) => item.parentElement === more.firstElementChild);
    expect(rows).toHaveLength(5);
    const entries = rows.map((row) => row.querySelector('.current-more__row')!);
    expect(entries.map((entry) => entry.textContent)).toEqual(['其余阶段', '年度详情', '指定时点', '计算说明与版本', '动效设置']);
    expect(entries.map((entry) => entry.tagName)).toEqual(['SUMMARY', 'A', 'A', 'SUMMARY', 'SUMMARY']);
    for (const entry of entries) {
      expect(entry.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      expect(entry.closest('.ds-info-card')).toBeNull();
    }
    expect(more.querySelector('.current-all-stages')).not.toHaveAttribute('open');
    expect(more.querySelector('.current-technical')).not.toHaveAttribute('open');
  });

  it('uses book-title source rows and keeps the teaching notice in calculation details', async () => {
    const user = userEvent.setup();
    const learning = mapLearning(createLearningDto());
    render(<ThemeProvider><PanelShell>
      <CurrentYunQiPage viewModel={learning.facts} learning={learning} />
    </PanelShell></ThemeProvider>, { wrapper: PageWrapper });
    const disclosure = screen.getByText('这些关系怎么读？').closest('details')!;
    await user.click(within(disclosure).getByText('这些关系怎么读？'));
    expect(within(disclosure).queryByRole('link')).toBeNull();
    const sources = within(disclosure).getAllByTitle('《传统理论测试来源》');
    expect(sources).toHaveLength(2);
    for (const source of sources) {
      expect(source).toHaveTextContent('《传统理论测试来源》');
      expect(source).not.toHaveAttribute('href');
      expect(source.querySelector('svg')).toBeNull();
    }
    expect(disclosure.querySelector('ul, li')).toBeNull();
    for (const relation of [learning.annualRelation, learning.currentQi]) {
      const insight = within(disclosure).getByRole('region', { name: relation.title });
      expect(within(insight).getByRole('heading', { name: relation.heading })).toBeVisible();
      expect(within(insight).getByText(relation.scope)).toBeVisible();
      expect(insight.querySelector('.ds-relation__chip')).toHaveClass(`ds-relation__chip--${relation.tone}`);
    }
    expect(within(disclosure).getByText('推演口径').parentElement).toHaveTextContent(learning.currentMovement.explanation);
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent('文献线索，非个体发病预测');
    expect(note.nextElementSibling).toBe(screen.getByRole('contentinfo'));
    expect(disclosure).not.toHaveTextContent('教学口径，待专家确认');
    expect(screen.getByText('五步运为教学口径，待专家确认 · 辅助参考，不作诊断依据')).toBeInTheDocument();
  });

  it('shows the movement DTO relation with the same chip as qi and no placeholder', () => {
    renderPage();
    const movement = screen.getByRole('region', { name: '当步运' });
    expect(movement).toHaveTextContent('火运太过');
    expect(movement).toHaveTextContent('木运不及');
    expect(movement).not.toHaveTextContent(/太徵|少角/);
    const chip = movement.querySelector('.ds-relation__chip');
    expect(chip?.textContent?.replaceAll('\u202f', ' ')).toBe('相得 · 客生主');
    expect(chip).toHaveClass('ds-relation__chip--favorable');
    expect(within(movement).getByText('客木生主火')).toBeVisible();
    expect(movement).not.toHaveTextContent('关系未提供');
    expect(movement).not.toHaveTextContent('主运与客运并列展示。');
    expect(screen.getByRole('region', { name: '当步气' }).querySelector('.ds-relation__chip')).not.toBeNull();
  });

  it('renders a movement relation only when it is explicitly supplied in the view model', () => {
    const mapped = mapLearning(createLearningDto());
    const relation = { label: '测试关系', tone: 'neutral', explanation: '测试接口提供的关系说明。' } as const;
    const learning = { ...mapped, currentMovement: { ...mapped.currentMovement, relation } };
    render(<CurrentYunQiPage viewModel={learning.facts} learning={learning} />, { wrapper: PageWrapper });
    const movement = screen.getByRole('region', { name: '当步运' });
    expect(within(movement).getByText(relation.label)).toHaveClass('ds-relation__chip--neutral');
    expect(within(movement).getByText(relation.explanation)).toBeVisible();
    expect(movement).not.toHaveTextContent('关系未提供');
  });

  it('shows annual compact times and symmetric stage subtitles, dots and relations', async () => {
    const { dto } = renderPage();
    const annual = screen.getByRole('region', { name: '全年\u202f·\u202f2026' });
    expect(within(annual).getByRole('heading', { name: '丙午' })).toBeVisible();
    expect(annual).toHaveTextContent('交运 01-20 09:00');
    expect(annual.querySelector('.ds-info-card__meta time')).toHaveAttribute('datetime', dto.facts.interval.start.localTime);
    expect(annual).toHaveTextContent('水运太过之年');
    expect(within(annual).getByText('水运太过')).toBeVisible();
    expect(within(annual).queryByText('太羽')).toBeNull();
    expect(within(annual).getByText('少阳相火')).toBeVisible();
    expect(within(annual).getByText('厥阴风木')).toBeVisible();
    expect(annual.querySelectorAll('.ds-element__dot')).toHaveLength(3);
    expect(within(annual).getByText('不和')).toHaveClass('ds-relation__chip--adverse');
    expect(annual).toHaveTextContent(dto.annualRelation.relation);

    const now = screen.getByRole('region', { name: '当下所处的气与运' });
    expect(now).not.toHaveTextContent('北京时间 UTC+08');
    expect(now.querySelector('.ds-info-card__eyebrow')).toBeNull();
    expect(now.querySelector('.current-observed-time')).toBeNull();
    expect(document.querySelector('.current-sixqi-progress')).toBeNull();
    expect(now.textContent).not.toMatch(/\d{2}:\d{2}:\d{2}|\.\d{3}/);
    const progress = within(annual).getByRole('img');
    expect(progress).toHaveAccessibleName('年轮：外环六步气，当前第3步三之气，已过约 47%；内环五步运，当前第2运二之运，已过约 47%');
    expect(progress.querySelectorAll('[data-ring="qi"] > g')).toHaveLength(6);
    expect(progress.querySelectorAll('[data-ring="qi"] .is-completed')).toHaveLength(2);
    expect(progress.querySelectorAll('[data-ring="qi"] .is-current')).toHaveLength(1);
    expect(within(annual).getByText('外环 · 六步气')).toBeVisible();
    expect(within(annual).getByText('内环 · 五步运')).toBeVisible();
    const qi = within(now).getByRole('region', { name: '当步气' });
    expect(within(qi).getByRole('heading', { name: '三之气' })).toBeVisible();
    expect(qi.querySelector('.current-period-cell--range')).toHaveTextContent('小满 → 大暑');
    expect(qi.querySelector('.current-period-cell--remaining')).toHaveTextContent('还有 34 天');
    expect(qi.querySelectorAll('time')).toHaveLength(0);
    expect(within(qi).getByText('相得')).toHaveClass('ds-relation__chip--favorable');
    expect(qi).toHaveTextContent('客生主');
    const movement = within(now).getByRole('region', { name: '当步运' });
    expect(movement).toHaveTextContent('火运太过');
    expect(movement).toHaveTextContent('木运不及');
    expect(movement).not.toHaveTextContent(/太徵|少角/);
    expect(movement.querySelector('.current-period-cell--range')).toHaveTextContent('春分后13日 → 芒种后10日');
    expect(movement.querySelector('.current-period-cell--remaining')).toHaveTextContent('还有 34 天');
    expect(movement.querySelectorAll('time')).toHaveLength(0);
    expect(screen.getByRole('link', { name: '年度详情' })).toHaveAttribute('href', '/yunqi/year/2026');
    expect(screen.getByRole('link', { name: '指定时点' })).toHaveAttribute('href', '/yunqi/calculate');
    expect(screen.getByRole('link', { name: '原文与释义' })).toHaveAttribute('href', '/yunqi/current/classics');
    expect(screen.getByText('“主胜逆，客胜从。”')).toBeVisible();
    expect(document.querySelector('.current-overview__quote .ds-info-card__hint')).toBeNull();
  });

  it('shows same-day transitions using the two independently supplied API end clocks', () => {
    const dto = createLearningDto();
    const learning = mapLearning({ ...dto,
      facts: { ...dto.facts, currentStepProgress: { elapsedRatio: 0.999, remainingCalendarDays: 0, endsOnInputDate: true } },
      currentMovement: { ...dto.currentMovement, end: { ...dto.currentMovement.end, localTime: '2026-07-23T23:59:45.678+08:00' } },
      currentMovementProgress: { elapsedRatio: 0.999, remainingCalendarDays: 0, endsOnInputDate: true },
    });
    render(<CurrentYunQiPage viewModel={learning.facts} learning={learning} />, { wrapper: PageWrapper });
    const qi = screen.getByRole('region', { name: '当步气' });
    const movement = screen.getByRole('region', { name: '当步运' });
    expect(qi.querySelector('.current-period-cell--range')).toHaveTextContent('小满 → 大暑');
    expect(qi.querySelector('.current-period-cell--remaining')).toHaveTextContent('今日 12:00 交气');
    expect(movement.querySelector('.current-period-cell--range')).toHaveTextContent('春分后13日 → 芒种后10日');
    expect(movement.querySelector('.current-period-cell--remaining')).toHaveTextContent('今日 23:59 交运');
  });

  it.each([0, 0.375, 0.929, 0.999])('keeps the current ring segment solid and announces the supplied ratio %s', (elapsedRatio) => {
    const dto = createLearningDto();
    const learning = mapLearning({ ...dto, facts: { ...dto.facts, currentStepProgress: { ...dto.facts.currentStepProgress, elapsedRatio } } });
    const { container } = render(<CurrentYunQiPage viewModel={learning.facts} learning={learning} />, { wrapper: PageWrapper });
    const progress = screen.getByRole('img');
    expect(container.querySelectorAll('[data-ring="qi"] .is-current > path')).toHaveLength(1);
    expect(progress.querySelector('[data-ring="qi"] .is-current > path')).toHaveStyle({ fill: 'var(--accent)' });
    expect(progress).toHaveAccessibleName(new RegExp(`当前第3步三之气，已过约 ${Math.round(elapsedRatio * 100)}%`));
    expect(progress.querySelector('linearGradient, clipPath, mask')).toBeNull();
  });

  it.each(['同属木运 · 太少相同', '同属火运 · 太少不同'])('shows only the traditionalLabel %s for a same-element movement', (label) => {
    const dto = createLearningDto();
    const learning = mapLearning({ ...dto, currentMovement: { ...dto.currentMovement,
      relation: { elementRelation: 'SAME_ELEMENT', direction: 'NONE', traditionalLabel: label },
    } });
    render(<CurrentYunQiPage viewModel={learning.facts} learning={learning} />, { wrapper: PageWrapper });
    const movement = screen.getByRole('region', { name: '当步运' });
    const chip = movement.querySelector('.ds-relation__chip');
    expect(chip?.textContent?.replaceAll('\u202f', ' ')).toBe(label);
    expect(chip).toHaveClass('ds-relation__chip--neutral');
    expect([...chip!.querySelectorAll('.ds-seg')].map(segment => segment.textContent)).toEqual(label.split(' · '));
    expect(movement).not.toHaveTextContent('不和');
    expect(movement.querySelector('.ds-relation__explanation')).toBeNull();
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
    expect(within(reading.parentElement!).getAllByTitle(dto.annualRelation.sources[0].title)[0]).toBeVisible();
    expect(within(reading.parentElement!).getByText(dto.currentMovement.explanation, { exact: true })).toBeVisible();

    expect(screen.getByRole('region', { name: '六步交接时间线' })).not.toBeVisible();
    const allStages = screen.getByText('其余阶段', { exact: true });
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
    expect(movements).toHaveTextContent('火运太过（太徵）');
    expect(movements).toHaveTextContent('木运不及（少角）');
    expect(within(movements).getByText(dto.movements[0].relation.traditionalLabel)).toHaveClass('ds-relation__chip--favorable');
    expect(within(movements).getByText('客木生主火')).toBeVisible();
    await user.click(allStages);
    expect(timeline).not.toBeVisible();

    await user.click(screen.getByText('计算说明与版本'));
    const precision = screen.getByRole('region', { name: '精确时刻' });
    const expectedTimes = [dto.facts.input, dto.facts.interval.start, dto.facts.interval.end,
      ...dto.facts.sixQi.steps.flatMap((step) => [step.start, step.end]),
      ...dto.movements.flatMap((step) => [step.start, step.end])];
    expect([...precision.querySelectorAll('time')].map((time) => time.dateTime)).toEqual(expectedTimes.map((time) => time.localTime));
    for (const time of precision.querySelectorAll('time')) expect(time.textContent).toBe(time.dateTime.replace('T', ' ').replace(/\+08:00$/, ''));
    const ruleNotes = screen.getByRole('region', { name: '规则结果说明' });
    expect(ruleNotes).toHaveTextContent('本结果依据冻结规则计算。');
    expect(within(ruleNotes).getByText(dto.ruleVersion, { exact: true })).toBeVisible();
    const trace = screen.getByRole('region', { name: '追溯信息' });
    expect(trace).toHaveTextContent('YunQi 当前查询 API');
    expect(trace).toHaveTextContent('YQ-API-CONTRACT-1.3.0');
    expect(trace).toHaveTextContent('YQ-MVP-RULES-1.1.0');
    expect(trace).not.toHaveTextContent('北京时间 UTC+08');
  });

  it('keeps API milliseconds only in calculation details', async () => {
    const user = userEvent.setup();
    const dto = createLearningDto();
    const localTime = '2026-06-19T12:00:23.456+08:00';
    const learning = mapLearning({ ...dto, facts: { ...dto.facts, input: { ...dto.facts.input, localTime } } });
    const { container } = render(<CurrentYunQiPage viewModel={learning.facts} learning={learning} />, { wrapper: PageWrapper });
    const visibleTimes = [...container.querySelectorAll('time')].filter((time) => !time.closest('.current-technical'));
    for (const time of visibleTimes) expect(time.textContent).not.toMatch(/\d{2}:\d{2}:\d{2}|\.\d{3}/);
    const exact = container.querySelector(`time[datetime="${localTime}"]`);
    expect(exact).not.toBeVisible();
    await user.click(screen.getByText('计算说明与版本'));
    expect(exact).toBeVisible();
    expect(exact).toHaveTextContent('2026-06-19 12:00:23.456');
  });

  it('keeps the original-text route reachable when no current excerpt was returned', () => {
    const learning = mapLearning({ ...createLearningDto(), currentPassages: [] });
    render(<CurrentYunQiPage viewModel={learning.facts} learning={learning} />, { wrapper: PageWrapper });
    expect(screen.getByText('此范围暂未收录已核对原文。')).toBeVisible();
    expect(screen.getByRole('link', { name: '原文与释义' })).toHaveAttribute('href', '/yunqi/current/classics');
  });
});
