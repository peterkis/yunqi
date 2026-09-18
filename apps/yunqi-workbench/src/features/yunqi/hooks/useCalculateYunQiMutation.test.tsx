import { act, renderHook, waitFor } from '@testing-library/react';
import type { YunQiClient } from '@yunqi/client';
import { describe, expect, it, vi } from 'vitest';
import { createYunQiCalculationDto } from '../../../test/yunqi-fixtures';
import { createTestWrapper } from '../../../test/test-utils';
import { useCalculateYunQiMutation } from './useCalculateYunQiMutation';

describe('useCalculateYunQiMutation', () => {
  it('does not request before mutate and passes the exact request to the injected client', async () => {
    const response = createYunQiCalculationDto();
    const client: YunQiClient = {
      getCurrent: vi.fn(),
      getYear: vi.fn(),
      calculate: vi.fn().mockResolvedValue(response),
    };
    const { result } = renderHook(
      () => useCalculateYunQiMutation(),
      { wrapper: createTestWrapper(client) },
    );

    expect(client.calculate).not.toHaveBeenCalled();

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          dateTime: '2026-05-20T13:30:00+08:00',
        }),
      ).resolves.toBe(response);
    });

    expect(client.calculate).toHaveBeenCalledOnce();
    expect(client.calculate).toHaveBeenCalledWith({
      dateTime: '2026-05-20T13:30:00+08:00',
    });
  });

  it('exposes client errors without rewriting them', async () => {
    const error = new Error('service unavailable');
    const client: YunQiClient = {
      getCurrent: vi.fn(),
      getYear: vi.fn(),
      calculate: vi.fn().mockRejectedValue(error),
    };
    const { result } = renderHook(
      () => useCalculateYunQiMutation(),
      { wrapper: createTestWrapper(client) },
    );

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          dateTime: '2026-05-20T13:30:00+08:00',
        }),
      ).rejects.toBe(error);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });
});
