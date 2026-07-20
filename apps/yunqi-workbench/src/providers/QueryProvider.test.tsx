import {
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  createWorkbenchQueryClient,
  QueryProvider,
} from './QueryProvider';

function QueryClientProbe() {
  const client = useQueryClient();

  return (
    <span data-testid="query-client">
      {client instanceof QueryClient ? 'connected' : 'disconnected'}
    </span>
  );
}

describe('createWorkbenchQueryClient', () => {
  it('uses the frozen workbench query defaults', () => {
    const client = createWorkbenchQueryClient();

    expect(client.getDefaultOptions().queries).toMatchObject({
      staleTime: 300_000,
      retry: false,
      refetchOnWindowFocus: false,
    });
  });

  it('reports a rejected query through the query cache once', async () => {
    const onQueryError = vi.fn();
    const client = createWorkbenchQueryClient({ onQueryError });
    const queryError = new Error('query failed');

    await expect(
      client.fetchQuery({
        queryKey: ['rejected-query'],
        queryFn: () => Promise.reject(queryError),
      }),
    ).rejects.toBe(queryError);

    expect(onQueryError).toHaveBeenCalledOnce();
    expect(onQueryError).toHaveBeenCalledWith(
      queryError,
      expect.any(Object),
    );
  });
});

describe('QueryProvider', () => {
  it('provides an injected query client to descendants', () => {
    const client = createWorkbenchQueryClient();

    render(
      <QueryProvider client={client}>
        <QueryClientProbe />
      </QueryProvider>,
    );

    expect(screen.getByTestId('query-client')).toHaveTextContent(
      'connected',
    );
  });
});
