import type { YunQiClient } from '@yunqi/client';
import type { PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  createWorkbenchQueryClient,
  QueryProvider,
} from '../providers/QueryProvider';
import { YunQiClientProvider } from '../providers/YunQiClientProvider';
import { ThemeProvider } from '../providers/ThemeProvider';
import { MotionProvider } from '../providers/MotionProvider';
import { PanelShell } from '../components/layout/PanelShell';

export function createTestWrapper(client: YunQiClient, panelRoute?: string) {
  const queryClient = createWorkbenchQueryClient();

  return function TestWrapper({ children }: PropsWithChildren) {
    return (
      <MemoryRouter initialEntries={panelRoute ? [panelRoute] : undefined}>
        <MotionProvider>
          <QueryProvider client={queryClient}>
            <YunQiClientProvider client={client}>
              {panelRoute ? <ThemeProvider><PanelShell>{children}</PanelShell></ThemeProvider> : children}
            </YunQiClientProvider>
          </QueryProvider>
        </MotionProvider>
      </MemoryRouter>
    );
  };
}
