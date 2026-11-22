import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPanelRoute, navigationItems } from '../../app/routes';
import { PanelNavigation } from '../../app/PanelNavigation';
import type { PanelSummaryViewModel } from '../../features/yunqi/presentation/panel-summary';
import { useTheme } from '../../providers/ThemeProvider';
import { useMotionLevel, useMotionPreference } from '../../providers/MotionProvider';
import { motionMilliseconds } from '../../lib/motion';
import { Button } from '../design/Button';
import { InlineText } from '../design/InlineText';
import { PanelHeader } from '../design/PanelHeader';
import { RelationChip } from '../design/RelationChip';
import { SegmentedNav } from '../design/SegmentedNav';
import { PanelSummaryContext } from './PanelSummary';
import { PanelViewContext, type PanelViewOptions } from './PanelView';

export interface PanelHostMotionHooks {
  /** Synchronous host resize hooks; the Web default is a no-op. */
  readonly onBeforeCollapse?: () => void;
  readonly onAfterExpand?: () => void;
}

export interface PanelShellProps extends PanelHostMotionHooks {
  readonly children: ReactNode;
  readonly actions?: ReactNode;
}

export function PanelShell(props: PanelShellProps) {
  return <PanelNavigation><PanelFrame {...props} /></PanelNavigation>;
}

function PanelFrame({ children, actions, onBeforeCollapse, onAfterExpand }: PanelShellProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const route = getPanelRoute(pathname);
  const { theme, toggleTheme } = useTheme();
  const level = useMotionLevel();
  const manualStandard = useMotionPreference() === 'full';
  const [phase, setPhase] = useState<'expanded' | 'collapsing' | 'collapsed' | 'pill-exit' | 'expanding'>('expanded');
  const collapsed = phase === 'collapsed' || phase === 'pill-exit';
  const shellRef = useRef<HTMLDivElement>(null);
  const [summary, setSummary] = useState<PanelSummaryViewModel>();
  const [view, setView] = useState<PanelViewOptions>();
  const title = view?.drilldown?.title ?? route.title;
  const viewActions = view?.actions ?? actions;
  const mainRef = useRef<HTMLElement>(null);
  const collapseRef = useRef<HTMLButtonElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const wasCollapsed = useRef(false);

  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main || level !== 'full' || phase !== 'expanded') return;
    let disposed = false;
    let detach: (() => void) | undefined;
    void import('../../lib/panel-wheel-scroll').then(({ attachPanelWheelScroll }) => {
      if (!disposed) detach = attachPanelWheelScroll(main, { manualStandard });
    }, () => { /* A missing optional motion chunk leaves native scrolling in place. */ });
    return () => { disposed = true; detach?.(); };
  }, [level, manualStandard, phase, pathname]);

  // Timers advance state even without CSS/WAAPI/events. A live switch to off
  // completes an outstanding exit synchronously in the layout commit.
  useLayoutEffect(() => {
    if (phase !== 'collapsing' && phase !== 'pill-exit' && phase !== 'expanding') return;
    function advance() {
      if (phase === 'collapsing') { onBeforeCollapse?.(); setPhase('collapsed'); }
      else if (phase === 'pill-exit') { onAfterExpand?.(); setPhase('expanding'); }
      else setPhase('expanded');
    }
    if (level === 'off') { advance(); return; }
    const timer = setTimeout(advance, motionMilliseconds(shellRef.current!, phase === 'expanding' ? '--motion-slow' : '--motion-fast'));
    return () => clearTimeout(timer);
  }, [phase, level, onBeforeCollapse, onAfterExpand]);

  function collapse() {
    if (level === 'off') { onBeforeCollapse?.(); setPhase('collapsed'); }
    else setPhase('collapsing');
  }
  function expand() {
    if (level === 'off') { onAfterExpand?.(); setPhase('expanded'); }
    else setPhase('pill-exit');
  }

  useEffect(() => {
    document.title = `${title} · 运气通`;
  }, [title]);

  useLayoutEffect(() => {
    if (collapsed) expandRef.current?.focus({ preventScroll: true });
    else if (wasCollapsed.current) collapseRef.current?.focus({ preventScroll: true });
    wasCollapsed.current = collapsed;
  }, [collapsed]);

  return (
    <PanelSummaryContext.Provider value={setSummary}>
    <PanelViewContext.Provider value={setView}>
      <div className={`panel-viewport${collapsed ? ' panel-viewport--collapsed' : ''}`} data-panel-phase={phase}>
        {collapsed && (
          <button className="panel-pill" type="button" ref={expandRef}
            aria-expanded={false} aria-controls="yunqi-panel" onClick={expand}>
            <span className="visually-hidden">展开运气通：</span>
            {summary ? (
              <>
                <span className="panel-pill__ganzhi">{summary.ganzhi}</span>
                <span className="panel-pill__text">
                  <span className="panel-pill__annual"><InlineText>{summary.annual}</InlineText></span>
                  {summary.stage && <span className="panel-pill__stage">
                    <InlineText>{summary.stage}</InlineText>
                    {summary.relation && <>
                      <RelationChip compact label={summary.relation.label} tone={summary.relation.tone} />
                      <span className="visually-hidden">{summary.relation.explanation}</span>
                    </>}
                  </span>}
                </span>
              </>
            ) : <span className="panel-pill__text"><InlineText>运气通 · 教学参考</InlineText><span className="panel-pill__stage">本视图暂无运气摘要</span></span>}
            <svg className="panel-pill__expand-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 10 4-4 4 4" /></svg>
          </button>
        )}
        {/* Keep the route mounted so collapsing cannot destroy local form state. */}
        <div className="panel-shell jade-surface" id="yunqi-panel" ref={shellRef} hidden={collapsed}>
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
            <Button ref={collapseRef} variant="icon" aria-label="收起为胶囊条" aria-expanded={!collapsed} aria-controls="yunqi-panel" onClick={collapse}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg>
            </Button>
          </>} />
          <div className="panel-shell__navigation">
            {view?.drilldown
              ? <section className="panel-shell__drilldown" aria-label="页面导航">
                  <PanelHeader variant="drilldown" title={view.drilldown.title} onBack={view.drilldown.onBack} />
                </section>
              : route.kind === 'segment'
              ? <SegmentedNav segments={navigationItems} label="工作台导航" />
              : <section className="panel-shell__drilldown" aria-label="页面导航">
                  <PanelHeader variant="drilldown" title={route.title} subtitle={route.subtitle} onBack={() => navigate(route.backTo)} />
                </section>}
          </div>
          <main className="panel-shell__content" id="workbench-content" ref={mainRef} tabIndex={0} aria-label={title}>{children}</main>
          {viewActions && <div className="panel-shell__actions">{viewActions}</div>}
          <footer className="panel-shell__footer">
            <span className="panel-shell__credit">中医科 <span aria-hidden="true">×</span> 信息管理部</span>
            <span>联合研发</span>
            <span className="num">© 2026</span>
          </footer>
        </div>
      </div>
    </PanelViewContext.Provider>
    </PanelSummaryContext.Provider>
  );
}
