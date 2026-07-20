import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
  type Query,
} from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

export interface WorkbenchQueryClientOptions {
  readonly onQueryError?: (
    error: Error,
    query: Query<unknown, unknown, unknown, readonly unknown[]>,
  ) => void;
}

export function createWorkbenchQueryClient(
  options: WorkbenchQueryClientOptions = {},
) {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: options.onQueryError,
    }),
    defaultOptions: {
      queries: {
        staleTime: 300_000,
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });
}

const defaultQueryClient = createWorkbenchQueryClient();

export interface QueryProviderProps extends PropsWithChildren {
  readonly client?: QueryClient;
}

export function QueryProvider({
  children,
  client = defaultQueryClient,
}: QueryProviderProps) {
  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}
