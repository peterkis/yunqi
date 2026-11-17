import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPanelRoute, navigationItems } from '../../app/routes';
import type { PanelSummaryViewModel } from '../../features/yunqi/presentation/panel-summary';
import { useTheme } from '../../providers/ThemeProvider';
import { Button } from '../design/Button';
import { PanelHeader } from '../design/PanelHeader';
import { RelationChip } from '../design/RelationChip';
import { SegmentedNav } from '../design/SegmentedNav';
import { PanelSummaryContext } from './PanelSummary';

export interface PanelShellProps {
  readonly children: ReactNode;
  readonly actions?: ReactNode;
}

export function PanelShell({ children, actions }: PanelShellProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const route = getPanelRoute(pathname);
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [summary, setSummary] = useState<PanelSummaryViewModel>();
  const mainRef = useRef<HTMLElement>(null);
  const collapseRef = useRef<HTMLButtonElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const previousArea = useRef(route.id);
  const wasCollapsed = useRef(false);

  useEffect(() => {
    document.title = `${route.title} · 运气通`;
  }, [route.title]);

  useLayoutEffect(() => {
    if (previousArea.current !== route.id) {
      mainRef.current?.focus({ preventScroll: true });
      if (mainRef.current) mainRef.current.scrollTop = 0;
    }
    previousArea.current = route.id;
  }, [route.id]);

  useLayoutEffect(() => {
    if (collapsed) expandRef.current?.focus({ preventScroll: true });
    else if (wasCollapsed.current) collapseRef.current?.focus({ preventScroll: true });
    wasCollapsed.current = collapsed;
  }, [collapsed]);

  return (
    <PanelSummaryContext.Provider value={setSummary}>
      <div className="panel-viewport">
        {collapsed && (
          <button className="panel-pill" type="button" ref={expandRef}
            aria-expanded={false} aria-controls="yunqi-panel" onClick={() => setCollapsed(false)}>
            <span className="visually-hidden">展开运气通：</span>
            {summary ? (
              <>
                <span className="panel-pill__ganzhi">{summary.ganzhi}</span>
                <span className="panel-pill__text">
                  <span className="panel-pill__annual">{summary.annual}</span>
                  {summary.stage && <span className="panel-pill__stage">
                    {summary.stage}
                    {summary.relation && <>
                      <RelationChip compact label={summary.relation.label} tone={summary.relation.tone} />
                      <span className="visually-hidden">{summary.relation.explanation}</span>
                    </>}
                  </span>}
                </span>
              </>
            ) : <span className="panel-pill__text">运气通 · 教学参考<span className="panel-pill__stage">本视图暂无运气摘要</span></span>}
            <svg className="panel-pill__expand-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 10 4-4 4 4" /></svg>
          </button>
        )}
        {/* Keep the route mounted so collapsing cannot destroy local form state. */}
        <div className="panel-shell" id="yunqi-panel" hidden={collapsed}>
          <a className="panel-shell__skip-link" href="#workbench-content" onClick={() => mainRef.current?.focus()}>跳至主要内容</a>
          <PanelHeader title="运气通" status="教学参考 · 本次会话不关联患者" actions={<>
            <Button variant="icon" aria-label={`切换至${theme === 'light' ? '深色' : '浅色'}主题`} onClick={toggleTheme}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {theme === 'light' ? <path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z" /> : <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
                </>}
              </svg>
            </Button>
            <Button ref={collapseRef} variant="icon" aria-label="收起为胶囊条" aria-expanded={!collapsed} aria-controls="yunqi-panel" onClick={() => setCollapsed(true)}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg>
            </Button>
          </>} />
          <div className="panel-shell__navigation">
            {route.kind === 'segment'
              ? <SegmentedNav segments={navigationItems} label="工作台导航" />
              : <section className="panel-shell__drilldown" aria-label="页面导航">
                  <PanelHeader variant="drilldown" title={route.title} subtitle={route.subtitle} onBack={() => navigate(route.backTo)} />
                </section>}
          </div>
          <main className="panel-shell__content" id="workbench-content" ref={mainRef} tabIndex={0} aria-label={route.title}>{children}</main>
          {actions && <div className="panel-shell__actions">{actions}</div>}
          <footer className="panel-shell__footer">五步运为教学口径 · 待专家确认 · 辅助参考，不作诊断依据</footer>
        </div>
      </div>
    </PanelSummaryContext.Provider>
  );
}
