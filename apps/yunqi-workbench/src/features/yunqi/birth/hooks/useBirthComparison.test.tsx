import { useQueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createClientStub } from '../../../../test/learning-fixtures';
import { createTestWrapper } from '../../../../test/test-utils';
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
});
