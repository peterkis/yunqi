import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../providers/ThemeProvider';
import type { PanelSummaryViewModel } from '../../features/yunqi/presentation/panel-summary';
import { PanelShell } from './PanelShell';
import { PanelSummary } from './PanelSummary';

function LocationProbe() {
  const { pathname, search, hash } = useLocation();
  return <output aria-label="测试地址">{pathname}{search}{hash}</output>;
}

function renderShell(route = '/yunqi/current', children: ReactNode = <h2>页面内容</h2>, actions?: ReactNode) {
  return render(<MemoryRouter initialEntries={[route]}>
    <ThemeProvider><PanelShell actions={actions}>{children}</PanelShell></ThemeProvider>
    <LocationProbe />
  </MemoryRouter>);
}

const snapshot: PanelSummaryViewModel = {
  ganzhi: '丙午', annual: '水运太过 · 少阴君火司天 · 阳明燥金在泉',
  stage: '五之气 · 客气少阳相火',
  relation: { label: '从', tone: 'favorable', explanation: '客火克主金，客胜主为从。' },
};

describe('PanelShell', () => {
  it.each([
    ['/', '当下运气'], ['/yunqi/current', '当下运气'],
    ['/yunqi/birth', '先天对照'], ['/yunqi/constitution', '体质量表'],
  ])('provides a branded panel and exactly three segments on %s', (route, label) => {
    renderShell(route);
    const banner = screen.getByRole('banner');
    expect(banner).toHaveTextContent('运气通');
    expect(banner).toHaveTextContent('教学参考 · 本次会话不关联患者');
    expect(banner).not.toHaveTextContent(/HIS|就诊|姓名|年龄|TCM YunQi Lab/);
    const nav = screen.getByRole('navigation', { name: '工作台导航' });
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual(['当下运气', '先天对照', '体质量表']);
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(route === '/' ? 0 : 1);
    if (route !== '/') expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('main', { name: label })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('link', { name: '跳至主要内容' })).toHaveAttribute('href', '#workbench-content');
    expect(screen.getByRole('contentinfo')).toHaveTextContent('五步运为教学口径 · 待专家确认 · 辅助参考，不作诊断依据');
    expect(document.title).toBe(`${label} · 运气通`);
  });

  it.each([
    ['/yunqi/year', '年度详情'], ['/yunqi/year/2026', '年度详情'],
    ['/yunqi/year/abc', '年度详情'], ['/yunqi/calculate', '指定时点'],
    ['/yunqi/inquiry', '问诊规划'], ['/unknown', '页面未找到'],
    ['/yunqi/inquiry/patient', '页面未找到'],
  ])('shows deterministic drill-down navigation even on a direct visit to %s', async (route, title) => {
    const user = userEvent.setup();
    renderShell(route);
    expect(screen.queryByRole('navigation', { name: '工作台导航' })).not.toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('运气通');
    const drilldown = screen.getByRole('region', { name: '页面导航' });
    expect(within(drilldown).getByRole('heading', { name: title })).toBeInTheDocument();
    expect(document.title).toBe(`${title} · 运气通`);
    expect(screen.getByRole('main', { name: title })).toHaveAttribute('tabindex', '0');
    await user.click(within(drilldown).getByRole('button', { name: '返回' }));
    expect(screen.getByLabelText('测试地址')).toHaveTextContent('/yunqi/current');
    expect(screen.getByRole('main')).toHaveFocus();
    expect(screen.getByRole('link', { name: '当下运气' })).toHaveAttribute('aria-current', 'page');
  });

  it('moves focus and resets only the content scroll when switching segments; the skip link also focuses content', async () => {
    const user = userEvent.setup();
    renderShell();
    const main = screen.getByRole('main');
    main.scrollTop = 200;
    await user.click(screen.getByRole('link', { name: '先天对照' }));
    expect(main).toHaveFocus();
    expect(main).toHaveAccessibleName('先天对照');
    expect(main.scrollTop).toBe(0);
    expect(screen.getByRole('link', { name: '当下运气' })).not.toHaveAttribute('aria-current');
    await user.click(screen.getByRole('link', { name: '体质量表' }));
    expect(main).toHaveFocus();
    expect(main).toHaveAccessibleName('体质量表');
    await user.click(screen.getByRole('link', { name: '跳至主要内容' }));
    expect(main).toHaveFocus();
  });

  it('keeps the existing accessible theme labels and toggles both directions', async () => {
    const user = userEvent.setup();
    const { container } = renderShell();
    await user.click(screen.getByRole('button', { name: '切换至深色主题' }));
    expect(container.querySelector('.theme-root')).toHaveAttribute('data-theme', 'dark');
    await user.click(screen.getByRole('button', { name: '切换至浅色主题' }));
    expect(container.querySelector('.theme-root')).toHaveAttribute('data-theme', 'light');
  });

  it('collapses to a keyboard button, retains the view and scroll, and restores trigger focus without persisting state', async () => {
    const user = userEvent.setup();
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const view = renderShell('/yunqi/birth?mode=local', <>
      <PanelSummary viewModel={snapshot} />
      <input aria-label="本地草稿" defaultValue="会话内容" />
    </>);
    const main = screen.getByRole('main');
    main.scrollTop = 200;
    const collapse = screen.getByRole('button', { name: '收起为胶囊条' });
    collapse.focus();
    await user.keyboard('{Enter}');
    const expand = screen.getByRole('button', { name: /^展开运气通/ });
    expect(expand).toHaveFocus();
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    expect(expand).toHaveTextContent(snapshot.annual);
    expect(expand).toHaveTextContent(snapshot.stage!);
    expect(expand).toHaveTextContent('从');
    expect(expand).toHaveAccessibleName(expect.stringContaining(snapshot.relation!.explanation));
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
    expect(screen.getByLabelText('测试地址')).toHaveTextContent('/yunqi/birth?mode=local');
    expect(storage).not.toHaveBeenCalled();
    await user.keyboard(' ');
    expect(collapse).toHaveFocus();
    expect(screen.getByLabelText('本地草稿')).toHaveValue('会话内容');
    expect(main.scrollTop).toBe(200);
    await user.click(collapse);
    await user.click(screen.getByRole('button', { name: /^展开运气通/ }));
    expect(collapse).toHaveFocus();
    // A fresh page instance starts expanded, irrespective of the last local state.
    await user.click(collapse);
    view.unmount();
    renderShell('/yunqi/birth');
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^展开运气通/ })).not.toBeInTheDocument();
    storage.mockRestore();
  });

  it('releases edited/unmounted snapshots and shows a neutral empty pill without adding data', async () => {
    const user = userEvent.setup();
    function Result() {
      const [visible, setVisible] = useState(true);
      const [updated, setUpdated] = useState(false);
      return <>
        {visible && <PanelSummary viewModel={updated ? { ganzhi: '丁未', annual: '年度新摘要' } : snapshot} />}
        <button onClick={() => setUpdated(true)}>更新摘要</button>
        <button onClick={() => setVisible(false)}>编辑输入</button>
      </>;
    }
    renderShell('/yunqi/current', <Result />, <button>可选操作</button>);
    expect(screen.getByRole('button', { name: '可选操作' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '更新摘要' }));
    await user.click(screen.getByRole('button', { name: '收起为胶囊条' }));
    expect(screen.getByRole('button', { name: /^展开运气通/ })).toHaveTextContent('丁未年度新摘要');
    expect(screen.getByRole('button', { name: /^展开运气通/ })).not.toHaveTextContent('五之气');
    await user.click(screen.getByRole('button', { name: /^展开运气通/ }));
    await user.click(screen.getByRole('button', { name: '编辑输入' }));
    await user.click(screen.getByRole('button', { name: '收起为胶囊条' }));
    expect(screen.getByRole('button', { name: /^展开运气通/ })).toHaveTextContent('本视图暂无运气摘要');
    expect(screen.getByRole('button', { name: /^展开运气通/ })).not.toHaveTextContent('丁未');
  });
});
