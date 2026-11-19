import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { useContext } from 'react';
import * as ReactRouter from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PanelNavigation } from './PanelNavigation';

const guardMessage = 'PanelNavigation.tsx：升级路由需复核 PanelNavigation 对 UNSAFE_NavigationContext 的依赖，见 M1-e-polish 第 4 项'
  + '（docs/plans/2026-11-18-motion-flows/cards/M1-e-polish.md）。';

const navigationCases = [
  { api: 'Link', role: 'link', method: 'push', replace: false },
  { api: 'Link', role: 'link', method: 'replace', replace: true },
  { api: 'useNavigate()', role: 'button', method: 'push', replace: false },
  { api: 'useNavigate()', role: 'button', method: 'replace', replace: true },
] as const;

function NavigationFixture({ to, replace }: { readonly to: string; readonly replace: boolean }) {
  const navigate = ReactRouter.useNavigate();
  const location = ReactRouter.useLocation();
  return <main id="workbench-content" tabIndex={-1}>
    <output aria-label="守护测试路径">{location.pathname}</output>
    <ReactRouter.Link to={to} replace={replace}>Link</ReactRouter.Link>
    <button type="button" onClick={() => { void navigate(to, { replace }); }}>useNavigate()</button>
  </main>;
}

function mount(from: string, to: string, replace: boolean) {
  // The direction signal is independent of motion level and browser animation APIs.
  return render(<ReactRouter.MemoryRouter initialEntries={[from]} useTransitions={false}>
    <PanelNavigation><NavigationFixture to={to} replace={replace} /></PanelNavigation>
  </ReactRouter.MemoryRouter>);
}

function clearNavigationData() {
  delete document.documentElement.dataset.navigationDirection;
  delete document.documentElement.dataset.viewTransition;
}

beforeEach(clearNavigationData);
afterEach(clearNavigationData);

describe('PanelNavigation.tsx router guard (M1-e-polish 第 4 项)', () => {
  it('exports UNSAFE_NavigationContext with callable MemoryRouter navigator.push/replace', () => {
    expect(ReactRouter, guardMessage).toHaveProperty('UNSAFE_NavigationContext');
    expect(ReactRouter.UNSAFE_NavigationContext, guardMessage).toBeDefined();
    let navigator: { readonly push: unknown; readonly replace: unknown } | undefined;
    function ContextProbe() {
      navigator = useContext(ReactRouter.UNSAFE_NavigationContext).navigator;
      return null;
    }
    render(<ReactRouter.MemoryRouter><ContextProbe /></ReactRouter.MemoryRouter>);
    expect(typeof navigator?.push, `${guardMessage} navigator.push 必须为函数。`).toBe('function');
    expect(typeof navigator?.replace, `${guardMessage} navigator.replace 必须为函数。`).toBe('function');
  });

  it.each(['react-router-dom', 'react-router'])('keeps installed %s at 7.18.1', packageName => {
    // Follow pnpm's installed link to read the DOM package and its sibling core dependency.
    const routerDomDirectory = realpathSync('node_modules/react-router-dom');
    const manifestPath = resolve(routerDomDirectory, '..', packageName, 'package.json');
    const { version } = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(version, `${packageName}：${guardMessage}`).toBe('7.18.1');
  });

  describe.each([
    { from: '/yunqi/current', to: '/yunqi/birth', direction: 'forward' },
    { from: '/yunqi/birth', to: '/yunqi/current', direction: 'backward' },
  ])('$from → $to', ({ from, to, direction }) => {
    it.each(navigationCases)('intercepts ordinary $api $method between top-level tabs', ({ api, role, replace }) => {
      mount(from, to, replace);
      expect(screen.getByLabelText('守护测试路径').textContent, guardMessage).toBe(from);
      expect(document.documentElement, guardMessage).not.toHaveAttribute('data-navigation-direction');

      fireEvent.click(screen.getByRole(role, { name: api }));

      expect(screen.getByLabelText('守护测试路径').textContent, guardMessage).toBe(to);
      expect(document.documentElement, guardMessage).toHaveAttribute('data-navigation-direction', direction);
    });
  });

  it.each(navigationCases)('does not mark in-area $api $method as a panel transition', ({ api, role, replace }) => {
    mount('/yunqi/year/2025', '/yunqi/year/2026', replace);
    expect(screen.getByLabelText('守护测试路径').textContent, guardMessage).toBe('/yunqi/year/2025');
    expect(document.documentElement, guardMessage).not.toHaveAttribute('data-navigation-direction');

    fireEvent.click(screen.getByRole(role, { name: api }));

    expect(screen.getByLabelText('守护测试路径').textContent, guardMessage).toBe('/yunqi/year/2026');
    expect(document.documentElement, guardMessage).not.toHaveAttribute('data-navigation-direction');
    expect(document.documentElement, guardMessage).not.toHaveAttribute('data-view-transition');
  });
});
