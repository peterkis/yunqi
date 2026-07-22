import type { YunQiClient } from '@yunqi/client';
import type { PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  createWorkbenchQueryClient,
  QueryProvider,
} from '../providers/QueryProvider';
import { YunQiClientProvider } from '../providers/YunQiClientProvider';

export function createTestWrapper(client: YunQiClient) {
  const queryClient = createWorkbenchQueryClient();

  return function TestWrapper({ children }: PropsWithChildren) {
    return (
      <MemoryRouter>
        <QueryProvider client={queryClient}>
          <YunQiClientProvider client={client}>
            {children}
          </YunQiClientProvider>
        </QueryProvider>
      </MemoryRouter>
    );
  };
}
