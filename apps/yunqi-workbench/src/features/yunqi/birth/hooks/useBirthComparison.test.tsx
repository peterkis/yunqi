import { useQueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createBirthComparisonDto, createClientStub } from '../../../../test/learning-fixtures';
import { createTestWrapper } from '../../../../test/test-utils';
import { currentYunQiQueryOptions } from '../../api/query-options';
import { useBirthComparison } from './useBirthComparison';

describe('birth response lifetime', () => {
  it('queries only on submit, projects a view model and discards birth mutation data when unmounted', async () => {
    const client = createClientStub();
    const hook = renderHook(() => ({ birth: useBirthComparison(), queryClient: useQueryClient() }), { wrapper: createTestWrapper(client) });
    expect(client.compareBirth).not.toHaveBeenCalled();
    act(() => hook.result.current.birth.submit({ birthDate: '1990-05-12' }));
    await waitFor(() => expect(hook.result.current.birth.result?.candidates[0].rows).toHaveLength(5));
    const cache = hook.result.current.queryClient.getMutationCache();
    expect(cache.getAll()).toHaveLength(1);
    expect(cache.getAll()[0].options.gcTime).toBe(0);
    act(() => hook.result.current.birth.reset());
    await waitFor(() => expect(hook.result.current.birth.result).toBeUndefined());
    hook.unmount();
    await waitFor(() => expect(cache.getAll()).toHaveLength(0));
    expect(client.getLearningCurrent).not.toHaveBeenCalled();
  });
  it('rejects an annual age result across midnight without replacing the last comparison', async () => {
    const { current, ruleVersion } = createBirthComparisonDto();
    const client = createClientStub({
      compareBirthYear: vi.fn().mockResolvedValue({ current, ruleVersion, birthPrecision: 'year', candidates: [] }),
    });
    const { result } = renderHook(() => ({ birth: useBirthComparison(), queryClient: useQueryClient() }),
      { wrapper: createTestWrapper(client) });
    act(() => result.current.birth.submit({ birthDate: '1990-05-12' }));
    await waitFor(() => expect(result.current.birth.result).toBeDefined());
    const previous = result.current.birth.result;
    const { queryKey } = currentYunQiQueryOptions(client);
    const before = { ...current.facts, input: { ...current.facts.input, localTime: '2026-06-18T23:59:59+08:00' } };
    act(() => { result.current.queryClient.setQueryData(queryKey, before); });
    const callbacks = { ageReferenceDate: '2026-06-18', onDateChanged: vi.fn(), onSuccess: vi.fn(), onSettled: vi.fn() };
    act(() => result.current.birth.submit({ year: 2001 }, callbacks));
    await waitFor(() => expect(callbacks.onSettled).toHaveBeenCalledOnce());
    expect(client.compareBirthYear).toHaveBeenCalledWith({ year: 2001 });
    expect(callbacks.onSuccess).not.toHaveBeenCalled();
    expect(callbacks.onDateChanged).toHaveBeenCalledOnce();
    expect(result.current.birth.result).toBe(previous);
    expect(result.current.queryClient.getQueryData(queryKey)).toEqual(current.facts);
  });
});
