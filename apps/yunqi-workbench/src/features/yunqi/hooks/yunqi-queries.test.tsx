import { renderHook, waitFor } from '@testing-library/react';
import type { YunQiClient } from '@yunqi/client';
import type {
  YunQiCalculationDto,
  YunQiYearDto,
} from '@yunqi/contracts';
import { describe, expect, it, vi } from 'vitest';
import { createTestWrapper } from '../../../test/test-utils';
import { useCurrentYunQiQuery } from './useCurrentYunQiQuery';
import { useYunQiYearQuery } from './useYunQiYearQuery';

describe('YunQi query hooks', () => {
  it('resolves the current calculation through the injected client', async () => {
    const currentResult = {
      marker: 'current',
    } as unknown as YunQiCalculationDto;
    const client: YunQiClient = {
      getCurrent: vi.fn().mockResolvedValue(currentResult),
      getYear: vi.fn(),
      calculate: vi.fn(),
    };
    const wrapper = createTestWrapper(client);

    const { result } = renderHook(() => useCurrentYunQiQuery(), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getCurrent).toHaveBeenCalledOnce();
    expect(result.current.data).toBe(currentResult);
  });

  it('resolves the requested year through the injected client', async () => {
    const yearResult = {
      marker: 'year',
    } as unknown as YunQiYearDto;
    const client: YunQiClient = {
      getCurrent: vi.fn(),
      getYear: vi.fn().mockResolvedValue(yearResult),
      calculate: vi.fn(),
    };
    const wrapper = createTestWrapper(client);

    const { result } = renderHook(() => useYunQiYearQuery(2026), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getYear).toHaveBeenCalledOnce();
    expect(client.getYear).toHaveBeenCalledWith(2026);
    expect(result.current.data).toBe(yearResult);
  });
});
