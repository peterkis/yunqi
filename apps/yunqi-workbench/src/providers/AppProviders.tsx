import type { QueryClient } from '@tanstack/react-query';
import type { YunQiClient } from '@yunqi/client';
import type { PropsWithChildren } from 'react';
import { ErrorBoundaryProvider } from './ErrorBoundaryProvider';
import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from './ThemeProvider';
import { YunQiClientProvider } from './YunQiClientProvider';

export interface AppProvidersProps extends PropsWithChildren {
  readonly queryClient?: QueryClient;
  readonly yunqiClient?: YunQiClient;
}

export function AppProviders({
  children,
  queryClient,
  yunqiClient,
}: AppProvidersProps) {
  return (
    <ErrorBoundaryProvider>
      <ThemeProvider>
        <QueryProvider client={queryClient}>
          <YunQiClientProvider client={yunqiClient}>
            {children}
          </YunQiClientProvider>
        </QueryProvider>
      </ThemeProvider>
    </ErrorBoundaryProvider>
  );
}
