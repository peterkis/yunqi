import { useContext, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { UNSAFE_NavigationContext, parsePath, useLocation, type To } from 'react-router-dom';
import { useMotionLevel } from '../providers/MotionProvider';
import { updateWithViewTransition } from './navigation-transition';
import { getPanelRoute, navigationItems } from './routes';

interface FocusEntry {
  readonly tag: string;
  readonly href: string | null;
  readonly label: string | null;
  readonly text: string | null;
}

interface Visit {
  readonly pathname: string;
  readonly parentKey?: string;
  readonly scrollTop: number;
  readonly focus?: FocusEntry;
}

interface Arrival {
  readonly pathname: string;
  readonly parentKey?: string;
  readonly restore?: Visit;
}

const focusable = 'a[href], button, input, select, textarea, [tabindex]';
const mainContent = () => document.getElementById('workbench-content');

function rememberFocus(main: HTMLElement): FocusEntry | undefined {
  const element = document.activeElement;
  if (!(element instanceof HTMLElement) || element === main || !main.contains(element)) return;
  return { tag: element.tagName, href: element.getAttribute('href'),
    label: element.getAttribute('aria-label'), text: element.textContent };
}

function findFocus(main: HTMLElement, entry: FocusEntry): HTMLElement | undefined {
  return [...main.querySelectorAll<HTMLElement>(focusable)].find(element =>
    !element.closest('[hidden], [inert]') && element.tagName === entry.tag && element.getAttribute('href') === entry.href
    && element.getAttribute('aria-label') === entry.label && element.textContent === entry.text);
}

/** All Link/NavLink/Navigate/useNavigate calls pass through the router's
 * navigator here. The locked router exposes this context; no page starts a
 * transition or owns navigation restoration. BrowserRouter disables React's
 * deferred navigation so M1-a's flushSync commits inside the snapshot callback. */
export function PanelNavigation({ children }: { readonly children: ReactNode }) {
  const navigation = useContext(UNSAFE_NavigationContext);
  const location = useLocation();
  const level = useMotionLevel();
  const visits = useRef(new Map<string, Visit>());
  const previous = useRef(location);
  const arrival = useRef<Arrival | undefined>(undefined);

  function ancestor(key: string | undefined, pathname: string): [string, Visit] | undefined {
    while (key !== undefined) {
      const visit = visits.current.get(key);
      if (!visit) break;
      if (visit.pathname === pathname) return [key, visit];
      key = visit.parentKey;
    }
  }

  const navigator = useMemo<typeof navigation.navigator>(() => {
    function change(method: 'push' | 'replace', to: To, state?: unknown, options?: Parameters<typeof navigation.navigator.push>[2]) {
      const pathname = (typeof to === 'string' ? parsePath(to).pathname : to.pathname) ?? location.pathname;
      const from = getPanelRoute(location.pathname);
      const target = getPanelRoute(pathname);
      // Root/default-year redirects and in-area year edits retain their focus
      // and do not start a second transition from a React lifecycle callback.
      if (from.id === target.id) {
        navigation.navigator[method](to, state, options);
        return;
      }
      const main = mainContent();
      visits.current.set(location.key, {
        pathname: location.pathname, parentKey: visits.current.get(location.key)?.parentKey,
        scrollTop: main?.scrollTop ?? 0, focus: main ? rememberFocus(main) : undefined,
      });
      const returning = from.kind === 'drilldown' && pathname === from.backTo;
      const origin = returning ? ancestor(visits.current.get(location.key)?.parentKey, pathname) : undefined;
      const parent = target.kind === 'drilldown' ? ancestor(location.key, target.backTo) : undefined;
      arrival.current = { pathname, parentKey: parent?.[0], restore: origin?.[1] };

      const fromIndex = navigationItems.findIndex(item => item.to === from.id);
      const toIndex = navigationItems.findIndex(item => item.to === target.id);
      document.documentElement.dataset.navigationDirection = returning || (fromIndex >= 0 && toIndex >= 0 && toIndex < fromIndex) ? 'backward' : 'forward';
      document.documentElement.dataset.viewTransition = level === 'full' && typeof document.startViewTransition === 'function' ? 'navigation' : 'navigation-fallback';
      updateWithViewTransition(() => navigation.navigator[method](to, state, options), level);
    }
    return { ...navigation.navigator,
      push: (to, state, options) => change('push', to, state, options),
      replace: (to, state, options) => change('replace', to, state, options),
    };
  }, [navigation, location, level]);

  useLayoutEffect(() => {
    const from = getPanelRoute(previous.current.pathname);
    const target = getPanelRoute(location.pathname);
    const pending = arrival.current?.pathname === location.pathname ? arrival.current : undefined;
    // Native history back uses the original location key, so it shares the
    // same in-memory restoration record as the explicit return action.
    const restore = pending?.restore ?? (from.kind === 'drilldown' && location.pathname === from.backTo
      ? visits.current.get(location.key) : undefined);
    if (!visits.current.has(location.key)) visits.current.set(location.key, {
      pathname: location.pathname, parentKey: pending?.parentKey ??
        (from.id === target.id ? visits.current.get(previous.current.key)?.parentKey : undefined),
      scrollTop: 0,
    });
    previous.current = location;
    arrival.current = undefined;
    if (from.id === target.id) return;
    const main = mainContent();
    if (!main) return;
    main.focus({ preventScroll: true });
    if (!restore) { main.scrollTop = 0; return; }

    function restoreView() {
      main!.scrollTop = restore!.scrollTop;
      const entry = restore!.focus ? findFocus(main!, restore!.focus) : main!;
      entry?.focus({ preventScroll: true });
      return entry !== undefined && Math.abs(main!.scrollTop - restore!.scrollTop) <= 2;
    }
    if (restoreView()) return;
    // Data may arrive after the route commits. Retry on content changes,
    // never on animation completion, and discard the observer on navigation.
    const observer = new MutationObserver(() => { if (restoreView()) observer.disconnect(); });
    observer.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    return () => observer.disconnect();
  }, [location]);

  return <UNSAFE_NavigationContext.Provider value={{ ...navigation, navigator }}>{children}</UNSAFE_NavigationContext.Provider>;
}
