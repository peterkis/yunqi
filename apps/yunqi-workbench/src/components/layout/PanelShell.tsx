import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { getPanelRoute, navigationItems } from '../../app/routes';
import { PanelNavigation } from '../../app/PanelNavigation';
import { BackToTop } from './BackToTop';
import type { PanelSummaryViewModel } from '../../features/yunqi/presentation/panel-summary';
import { useTheme } from '../../providers/ThemeProvider';
import { useMotionLevel, useMotionPreference } from '../../providers/MotionProvider';
import { animateMotion, motionMilliseconds } from '../../lib/motion';
import { Button } from '../design/Button';
import { InlineText } from '../design/InlineText';
import { PanelHeader } from '../design/PanelHeader';
import { RelationChip } from '../design/RelationChip';
import { SegmentedNav } from '../design/SegmentedNav';
import { PanelSummaryContext } from './PanelSummary';
import { PanelViewContext, type PanelViewOptions } from './PanelView';
import { WindowPinButton, type WindowPin } from './WindowPinButton';
import { DesktopUpdateNotice, type DesktopUpdates } from './DesktopUpdateNotice';

export interface PanelHostMotionHooks {
  readonly pin?: WindowPin;
  readonly updates?: DesktopUpdates;
  readonly onBeforeCollapse?: () => void | Promise<void>;
  readonly onAfterExpand?: () => void | Promise<void>;
  readonly onDragMargin?: () => void;
  readonly onTitleDrag?: () => void;
  readonly onResizeHeight?: (step?: -1 | 1) => Promise<void>;
}

export interface PanelShellProps extends PanelHostMotionHooks {
  readonly children: ReactNode;
  readonly actions?: ReactNode;
}

export function PanelShell(props: PanelShellProps) {
  return <PanelNavigation><PanelFrame {...props} /></PanelNavigation>;
}

function PanelFrame({ children, actions, onBeforeCollapse, onAfterExpand, onDragMargin, onTitleDrag, onResizeHeight, pin, updates }: PanelShellProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const route = getPanelRoute(pathname);
  const { theme, toggleTheme } = useTheme();
  const level = useMotionLevel();
  const themeIcon = useRef<SVGSVGElement>(null);
  const previousTheme = useRef(theme);
  useLayoutEffect(() => {
    if (previousTheme.current === theme) return;
    previousTheme.current = theme;
    if (level !== 'full') return;
    const animation = animateMotion(themeIcon.current, level, [
      { opacity: 0.6, transform: 'rotate(-20deg) scale(0.85)' },
      { opacity: 1, transform: 'rotate(0deg) scale(1)' },
    ], '--motion-base', '--ease-standard');
    return () => animation?.cancel();
  }, [theme, level]);
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
  const [hostError, setHostError] = useState(false);

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
    let active = true;
    function advance() {
      if (phase === 'expanding') { setPhase('expanded'); return; }
      const shrinking = phase === 'collapsing';
      const next = shrinking ? 'collapsed' : level === 'off' ? 'expanded' : 'expanding';
      const resize = shrinking ? onBeforeCollapse?.() : onAfterExpand?.();
      if (!resize) { setPhase(next); return; }
      void resize.then(() => { if (active) setPhase(next); }, () => {
        if (active) { setHostError(true); setPhase(shrinking ? 'expanded' : 'collapsed'); }
      });
    }
    const timer = level === 'off' ? undefined : setTimeout(advance, motionMilliseconds(shellRef.current!, phase === 'expanding' ? '--motion-slow' : '--motion-fast'));
    if (level === 'off') advance();
    return () => { active = false; clearTimeout(timer); };
  }, [phase, level, onBeforeCollapse, onAfterExpand]);

  function collapse() {
    setHostError(false);
    setPhase('collapsing');
  }
  function expand() {
    setHostError(false);
    setPhase('pill-exit');
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
      <div className={`panel-viewport${collapsed ? ' panel-viewport--collapsed' : ''}`} data-panel-phase={phase}
        onPointerDown={collapsed && onDragMargin ? (event) => {
          if (event.button === 0 && event.target === event.currentTarget) onDragMargin();
        } : undefined}>
        {hostError && <span role="alert">窗口调整失败，请重试</span>}
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
        <div className="panel-shell jade-surface" id="yunqi-panel" data-route={route.id} ref={shellRef} hidden={collapsed}>
          <a className="panel-shell__skip-link" href="#workbench-content" onClick={() => mainRef.current?.focus()}>跳至主要内容</a>
          <PanelHeader title="运气通" status="测试版 · 待接入HIS" onTitleDrag={onTitleDrag} actions={<>
            <Button variant="icon" data-theme-toggle="" aria-label={`切换至${theme === 'light' ? '深色' : '浅色'}主题`} onClick={toggleTheme}>
              {theme === 'light' ? <Moon ref={themeIcon} aria-hidden="true" /> : <Sun ref={themeIcon} aria-hidden="true" />}
            </Button>
            {pin && <WindowPinButton pin={pin} />}
            <Button ref={collapseRef} variant="icon" aria-label="收起为胶囊条" aria-expanded={!collapsed} aria-controls="yunqi-panel" onClick={collapse}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg>
            </Button>
          </>} />
          <div className="panel-shell__navigation">
            {route.kind === 'segment' && <SegmentedNav segments={navigationItems} label="工作台导航" />}
            {view?.drilldown
              ? <section className="panel-shell__drilldown" aria-label="页面导航">
                  <PanelHeader variant="drilldown" title={view.drilldown.toolbarActions ? '' : view.drilldown.title}
                    actions={view.drilldown.toolbarActions} onBack={view.drilldown.onBack} />
                </section>
              : route.kind === 'drilldown' && <section className="panel-shell__drilldown" aria-label="页面导航">
                  <PanelHeader variant="drilldown" title={route.title} subtitle={route.subtitle} onBack={() => navigate(route.backTo)} />
                </section>}
          </div>
          <main className="panel-shell__content" id="workbench-content" ref={mainRef} tabIndex={0} aria-label={title}>{children}</main>
          {viewActions && <div className="panel-shell__actions">{viewActions}</div>}
          {updates && <DesktopUpdateNotice updates={updates} />}
          <footer className="panel-shell__footer">
            <span className="panel-shell__byline">
              <span className="panel-shell__credit">中医科 <span aria-hidden="true">×</span> 信息管理部</span>
              <span>联合研发</span>
            </span>
            <span className="num">© 2026-2027</span>
            {phase === 'expanded' && <BackToTop key={pathname} contentRef={mainRef} />}
          </footer>
          {onResizeHeight && phase === 'expanded' && <button className="panel-height-grip" type="button"
            aria-label="调整窗口高度" title="拖动底边调高，或使用上下方向键"
            onPointerDown={event => {
              if (event.isPrimary && event.button === 0) {
                event.preventDefault();
                void onResizeHeight().catch(() => setHostError(true));
              }
            }}
            onKeyDown={event => {
              if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                void onResizeHeight(event.key === 'ArrowUp' ? -1 : 1).catch(() => setHostError(true));
              }
            }}
          />}
        </div>
      </div>
    </PanelViewContext.Provider>
    </PanelSummaryContext.Provider>
  );
}
