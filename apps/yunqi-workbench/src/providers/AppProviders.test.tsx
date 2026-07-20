import { useQueryClient } from '@tanstack/react-query';
import type { YunQiClient } from '@yunqi/client';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppProviders } from './AppProviders';
import { createWorkbenchQueryClient } from './QueryProvider';
import { useTheme } from './ThemeProvider';
import { useYunQiClient } from './YunQiClientProvider';

function createFakeClient(): YunQiClient {
  return {
    getYear: async () => {
      throw new Error('not implemented');
    },
    getCurrent: async () => {
      throw new Error('not implemented');
    },
    calculate: async () => {
      throw new Error('not implemented');
    },
  };
}

describe('AppProviders', () => {
  it('composes the theme, query, and YunQi client providers with injections', () => {
    const queryClient = createWorkbenchQueryClient();
    const yunqiClient = createFakeClient();
    let observedQueryClient: typeof queryClient | undefined;
    let observedYunQiClient: YunQiClient | undefined;

    function ProviderProbe() {
      const { theme } = useTheme();
      observedQueryClient = useQueryClient();
      observedYunQiClient = useYunQiClient();

      return <p>providers:{theme}</p>;
    }

    render(
      <AppProviders
        queryClient={queryClient}
        yunqiClient={yunqiClient}
      >
        <ProviderProbe />
      </AppProviders>,
    );

    expect(screen.getByText('providers:light')).toBeInTheDocument();
    expect(observedQueryClient).toBe(queryClient);
    expect(observedYunQiClient).toBe(yunqiClient);
  });
});
