import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createLearningDto } from '../../../test/learning-fixtures';
import { mapLearning } from '../presentation/map-learning';
import { CurrentClassicsPage } from './CurrentClassicsPage';

const longQuote = '凡此少阴司天之政，气化运行先天，地气肃，天气明，寒交暑，热加燥，云驰雨府，湿化迺行，时雨迺降，金火合德，上应荧惑太白。其政明，其令切，其谷丹白。水火寒热持于气交而为病始也，热病生于上，清病生于下，寒热凌犯而争于中，民病欬喘，血溢血泄鼽嚏，目赤眦疡，寒厥入胃，心痛腰痛腹大，嗌干肿上。';

describe('CurrentClassicsPage', () => {
  it('separates scopes, keeps sources and one notice, and exposes full API excerpts by keyboard', async () => {
    const user = userEvent.setup();
    const dto = createLearningDto();
    const annualPassage = { ...dto.annualPassages[0], quote: `“${longQuote}”` };
    const learning = mapLearning({ ...dto, annualPassages: [annualPassage] });
    const { container } = render(<CurrentClassicsPage learning={learning} />);
    const scope = screen.getByRole('group', { name: '原文范围' });
    const annual = within(scope).getByRole('button', { name: '全年' });
    const current = within(scope).getByRole('button', { name: '当下阶段' });
    expect(current).toHaveAttribute('aria-pressed', 'true');
    expect(annual).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('正在此段')).toBeVisible();
    expect(screen.getByText('阅读释义')).toBeVisible();
    expect(screen.getByText(dto.currentPassages[0].explanation)).toBeVisible();
    const source = screen.getByRole('link', { name: /查看原文出处/ });
    expect(source).toHaveAttribute('href', dto.currentPassages[0].sourceUrl);
    expect(source).toHaveClass('learning-text-link');
    expect(source).toHaveAccessibleName(expect.stringContaining('新窗口打开'));
    const notices = screen.getAllByText('文献线索，非个体发病预测');
    expect(notices).toHaveLength(1);
    const notice = notices[0];
    expect(notice).toHaveClass('current-classics__notice');
    expect(screen.getByRole('region', { name: '当下阶段原文' })).not.toContainElement(notice);

    annual.focus();
    await user.keyboard('{Enter}');
    expect(annual).toHaveFocus();
    expect(annual).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('正在此段')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: '全年原文' })).toHaveAttribute('id', annual.getAttribute('aria-controls'));
    expect(screen.getByText(`“${longQuote}”`)).not.toBeVisible();
    const full = screen.getByText('展开全段');
    // Native details keyboard activation is exercised in Playwright.
    await user.click(full);
    expect(screen.getByText(`“${longQuote}”`)).toBeVisible();
    expect(notice).toBeVisible();
    expect(screen.getByRole('region', { name: '全年原文' })).not.toContainElement(notice);
    expect(container.textContent).not.toContain('““');
    expect(screen.getByText(annualPassage.explanation)).toBeVisible();
    expect(screen.getByText(learning.annualPassages[0].source)).toBeVisible();
    expect(screen.getByRole('link', { name: /查看原文出处/ })).toHaveAttribute('rel', 'noreferrer');
    expect(screen.getByRole('link', { name: /查看原文出处/ })).toHaveAttribute('target', '_blank');
    await user.click(full);
    expect(screen.getByText(`“${longQuote}”`)).not.toBeVisible();
    await user.click(current);
    expect(screen.getByText('正在此段')).toBeVisible();
  });

  it('discloses no invented quotations when a scope has no passages', async () => {
    const user = userEvent.setup();
    const learning = mapLearning({ ...createLearningDto(), currentPassages: [], annualPassages: [] });
    render(<CurrentClassicsPage learning={learning} />);
    expect(screen.getByText('此范围暂未收录已核对原文。')).toBeVisible();
    expect(screen.queryByRole('blockquote')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '全年' }));
    expect(screen.getByText('此范围暂未收录已核对原文。')).toBeVisible();
  });
});
