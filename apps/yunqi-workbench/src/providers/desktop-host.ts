import { focusManager } from '@tanstack/react-query';
import { liveClockQueryOptions } from '../lib/live-clock-query';
import { createYunQiClient, YunQiApiError, type TransportRequest, type YunQiTransport } from '@yunqi/client';
import type { ApiErrorResponse } from '@yunqi/contracts';
import { createWorkbenchQueryClient } from './QueryProvider';
import type { DesktopUpdates } from '../components/layout/DesktopUpdateNotice';

interface DesktopHost {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
}
interface DesktopEvents {
  listen<T>(name: string, handler: (event: {payload: T}) => void): Promise<() => void>;
}

declare global {
  interface Window { __TAURI__?: { core: DesktopHost; event: DesktopEvents }; }
}

// A 6px auto-hidden Windows strip still reports document.visibilityState === 'visible'.
// Releasing the override delegates ordinary expanded and pill views to TanStack's document policy.
export function trackDesktopFoldedWindow(strip: MediaQueryList) {
  const update = () => focusManager.setFocused(strip.matches ? false : undefined);
  update();
  strip.addEventListener('change', update);
  return () => {
    strip.removeEventListener('change', update);
    focusManager.setFocused(undefined);
  };
}

export function connectDesktop(host: DesktopHost, events: DesktopEvents) {
  const transport: YunQiTransport = {
    async request<T>(request: TransportRequest) {
      const reply = await host.invoke<{ status: number; data: unknown }>('calculate', { request });
      if (reply.status < 200 || reply.status >= 300) {
        throw new YunQiApiError(reply.status, reply.data as ApiErrorResponse);
      }
      return reply.data as T;
    },
  };
  const queryClient = createWorkbenchQueryClient();
  const defaults = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({
    ...defaults,
    queries: {
      ...defaults.queries,
      networkMode: 'always',
      refetchOnWindowFocus: query => query.meta?.liveClock === true &&
        query.isStaleByTime(liveClockQueryOptions.refetchInterval),
    },
    mutations: { ...defaults.mutations, networkMode: 'always' },
  });
  const dragWindow = () => { void host.invoke<void>('drag_window').catch(() => {}); };
  return {
    client: createYunQiClient(transport), queryClient,
    pin: {
      read: () => host.invoke<boolean>('window_pin'),
      set: (pinned: boolean) => host.invoke<boolean>('window_pin', { pinned }),
      subscribe: (notify: (value: boolean) => void) =>
        events.listen<boolean>('window-pin-changed', event => notify(event.payload)),
    },
    updates: {
      read: () => host.invoke('update_status'),
      choose: (digest, action) => host.invoke('update_action', { digest, action }),
      subscribe: notify => events.listen('desktop-update-changed', notify),
    } satisfies DesktopUpdates,
    onBeforeCollapse: () => host.invoke<void>('set_collapsed', { collapsed: true }),
    onAfterExpand: () => host.invoke<void>('set_collapsed', { collapsed: false }),
    onDragMargin: dragWindow,
    onTitleDrag: dragWindow,
    onResizeHeight: (step?: -1 | 1) => host.invoke<void>('resize_panel_height', step ? { step } : undefined),
  };
}
