import { fillBirthDate } from '../../../../test/birth-input';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../../../app/App';
import { AppProviders } from '../../../../providers/AppProviders';
import { createWorkbenchQueryClient } from '../../../../providers/QueryProvider';
import { createBirthComparisonDto, createClientStub } from '../../../../test/learning-fixtures';

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="测试地址">{location.pathname}{location.search}{location.hash}</output>;
}

function renderBirth(route = '/yunqi/birth', dto = createBirthComparisonDto()) {
  const client = createClientStub({ compareBirth: vi.fn().mockResolvedValue(dto) });
  render(<MemoryRouter initialEntries={[route]}><AppProviders queryClient={createWorkbenchQueryClient()} yunqiClient={client}><App /><LocationProbe /></AppProviders></MemoryRouter>);
  return client;
}

describe('birth classics navigation', () => {
  it('retains the response and answer session across an in-app drill-down without putting birth data in storage or URL', async () => {
    const user = userEvent.setup();
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const client = renderBirth();
    fillBirthDate('1990-05-12');
    await user.click(screen.getByRole('button', { name: '查看对照' }));
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: '同时测评体质' }));
    const form = await screen.findByRole('form', { name: '中医体质量表' });
    await user.click(within(form).getByRole('radio', { name: '男' }));
    await user.click(within(form).getAllByRole('radio', { name: '有时' })[0]);
    await user.click(screen.getByRole('link', { name: '全部原文' }));
    expect(screen.getByLabelText('测试地址')).toHaveTextContent(/^\/yunqi\/birth\/classics$/);
    expect(screen.getByRole('heading', { name: '原文与释义' })).toBeVisible();
    expect(screen.queryByRole('navigation', { name: '工作台导航' })).not.toBeInTheDocument();
    expect(screen.queryByRole('form', { name: '中医体质量表' })).not.toBeInTheDocument();
    expect(document.querySelector('.panel-shell__actions')).toBeNull();
    await user.click(screen.getByRole('button', { name: '返回' }));
    expect(screen.getByRole('link', { name: '全部原文' })).toHaveFocus();
    expect(within(form).getByRole('img', { name: /已答 1 \/ 8/ })).toBeVisible();
    expect(screen.getByRole('button', { name: '结束并销毁答卷' }).closest('.panel-shell__actions')).not.toBeNull();
    expect(screen.getByRole('group', { name: '出生资料摘要' })).toHaveTextContent('1990-05-12 · 时刻不详 · 修改');
    expect(screen.queryByRole('form', { name: '出生运气输入' })).not.toBeInTheDocument();
    expect(client.compareBirth).toHaveBeenCalledOnce();
    expect(client.getLearningCurrent).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
    storage.mockRestore();
  });

  it('opens a direct classics address without fetching or recovering birth data', async () => {
    const user = userEvent.setup();
    const client = renderBirth('/yunqi/birth/classics');
    expect(screen.getByText('本页尚无出生对照，请先填写出生资料。')).toBeVisible();
    expect(client.compareBirth).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '返回出生输入' }));
    expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('');
    expect(screen.getByLabelText('测试地址')).toHaveTextContent(/^\/yunqi\/birth$/);
    expect(client.getLearningCurrent).not.toHaveBeenCalled();
  });

  it('keeps all candidates and empty-reading states available in both birth scopes', async () => {
    const user = userEvent.setup();
    const dto = createBirthComparisonDto();
    const candidate = dto.candidates[0];
    renderBirth('/yunqi/birth', { ...dto, ambiguous: true, candidates: [candidate, {
      ...candidate, label: '交界后', learning: { ...candidate.learning, annualPassages: [], currentPassages: [] },
    }] });
    fillBirthDate('1990-05-12');
    await user.click(screen.getByRole('button', { name: '查看对照' }));
    await screen.findByRole('table', { name: /交界后/ });
    expect(within(screen.getByRole('region', { name: '先天原文线索' })).getByText('此范围暂未收录已核对原文。')).toBeVisible();
    await user.click(screen.getByRole('link', { name: '全部原文' }));
    const empty = screen.getByRole('region', { name: '交界后原文' });
    expect(within(empty).getByText('此范围暂未收录已核对原文。')).toBeVisible();
    expect(within(empty).getByText(/起点包含，终点不包含/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: '全年' }));
    expect(within(empty).getByText('此范围暂未收录已核对原文。')).toBeVisible();
  });

  it('reads a precise birth stage and expands the full API paragraph without duplicated quotation marks', async () => {
    const user = userEvent.setup();
    const dto = createBirthComparisonDto();
    const candidate = dto.candidates[0];
    const quote = '古籍原句。'.repeat(15);
    renderBirth('/yunqi/birth', { ...dto, birthPrecision: 'time', candidates: [{ ...candidate, learning: { ...candidate.learning,
      annualPassages: [{ ...candidate.learning.annualPassages[0], quote: `“${quote}”` }],
    } }] });
    fillBirthDate('1990-05-12');
    await user.click(screen.getByRole('radio', { name: '已知时刻' }));
    fireEvent.change(screen.getByLabelText('出生时刻（北京时间）'), { target: { value: '09:30:21' } });
    await user.click(screen.getByRole('button', { name: '查看对照' }));
    await screen.findByRole('table');
    await user.click(screen.getByRole('link', { name: '全部原文' }));
    const reading = screen.getByRole('region', { name: '先天原文与释义' });
    expect(within(reading).queryByText(/可能出生区间/)).not.toBeInTheDocument();
    const source = within(screen.getByRole('region', { name: '出生运气原文' })).getByRole('link', { name: /^出处/ });
    expect(source).toHaveClass('learning-text-link');
    expect(source).toHaveAccessibleName(expect.stringContaining('新窗口打开'));
    expect(source).toHaveAttribute('target', '_blank');
    expect(source).toHaveAttribute('rel', 'noreferrer');
    await user.click(within(reading).getByRole('button', { name: '全年' }));
    await user.click(within(reading).getByText('展开全段'));
    expect(within(reading).getByText(quote, { exact: true })).toBeVisible();
    expect(within(reading).queryByText(/““/)).not.toBeInTheDocument();
    await user.click(within(reading).getByRole('button', { name: '出生阶段' }));
    expect(within(reading).getByRole('button', { name: '出生阶段' })).toHaveAttribute('aria-pressed', 'true');
  });
});
