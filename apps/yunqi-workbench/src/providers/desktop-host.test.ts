import { focusManager, onlineManager, QueryObserver } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { liveClockQueryOptions } from '../lib/live-clock-query';
import { connectDesktop, trackDesktopFoldedWindow } from './desktop-host';

describe('installed host', () => {
  it('passes structured requests and results directly across the desktop bridge', async () => {
    const body = { dateTime: '2026-05-16T11:00:00' };
    const result = { year: 2026 };
    const invoke = vi.fn().mockResolvedValue({ status: 200, data: { data: result } });
    const desktop = connectDesktop({ invoke }, { listen: vi.fn() });
    const value = await desktop.client.calculate(body);

    expect(invoke.mock.calls[0][1].request.body).toBe(body);
    expect(value).toBe(result);
  });

  it('skips hidden clock polls and catches up only stale active clocks on reveal', async () => {
    vi.useFakeTimers();
    const media = Object.assign(new EventTarget(), { matches: false });
    const fold = (matches: boolean) => {
      media.matches = matches;
      media.dispatchEvent(new Event('change'));
    };
    const { queryClient } = connectDesktop({ invoke: vi.fn() }, { listen: vi.fn() });
    queryClient.mount();
    const stopTracking = trackDesktopFoldedWindow(media as MediaQueryList);
    const clock = vi.fn().mockResolvedValue('current');
    const form = vi.fn().mockResolvedValue('form');
    const live = new QueryObserver(queryClient, { ...liveClockQueryOptions, queryKey: ['clock'], queryFn: clock });
    const questionnaire = new QueryObserver(queryClient, { queryKey: ['form'], staleTime: 0, queryFn: form });
    const stopClock = live.subscribe(() => {});
    const stopForm = questionnaire.subscribe(() => {});
    try {
      await vi.advanceTimersByTimeAsync(1);
      fold(true);
      await vi.advanceTimersByTimeAsync(180_000);
      expect(clock).toHaveBeenCalledTimes(1);
      fold(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(clock).toHaveBeenCalledTimes(2);
      expect(form).toHaveBeenCalledTimes(1);
      fold(true);
      await vi.advanceTimersByTimeAsync(200);
      fold(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(clock).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(clock).toHaveBeenCalledTimes(3);
    } finally {
      stopClock();
      stopForm();
      queryClient.unmount();
      stopTracking();
      queryClient.clear();
      focusManager.setFocused(undefined);
      vi.useRealTimers();
    }
  });

  it('sends offline queries and mutations over IPC and preserves API errors', async () => {
    const invoke = vi.fn().mockResolvedValueOnce({ status: 200, data: { data: { year: 2026 } } })
      .mockResolvedValueOnce({ status: 400, data: { code: 'INVALID_INPUT', message: '输入无效', details: {} } });
    const desktop = connectDesktop({ invoke }, { listen: vi.fn() });
    onlineManager.setOnline(false);
    try {
      const year = await desktop.queryClient.fetchQuery({queryKey:['desktop-year'],queryFn:()=>desktop.client.getYear(2026)});
      expect(year.year).toBe(2026);
      expect(invoke).toHaveBeenCalledWith('calculate',{request:{method:'GET',path:'/api/v1/yunqi/year/2026',body:undefined}});
      const mutation = desktop.queryClient.getMutationCache().build(desktop.queryClient, {
        mutationFn:()=>desktop.client.calculate({dateTime:'invalid'}),
      });
      await expect(mutation.execute(undefined)).rejects.toMatchObject({name:'YunQiApiError',status:400});
      expect(invoke).toHaveBeenCalledWith('calculate',{request:{method:'POST',path:'/api/v1/yunqi/calculate',body:{dateTime:'invalid'}}});
    } finally {
      onlineManager.setOnline(true);
      desktop.queryClient.clear();
    }
  });
});
