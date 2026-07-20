import type { YunQiClient } from '@yunqi/client';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  useYunQiClient,
  YunQiClientProvider,
} from './YunQiClientProvider';

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

describe('YunQiClientProvider', () => {
  it('provides an injected YunQi client to descendants', () => {
    const fakeClient = createFakeClient();
    let observedClient: YunQiClient | undefined;

    function ClientProbe() {
      observedClient = useYunQiClient();
      return null;
    }

    render(
      <YunQiClientProvider client={fakeClient}>
        <ClientProbe />
      </YunQiClientProvider>,
    );

    expect(observedClient).toBe(fakeClient);
  });
});

describe('useYunQiClient', () => {
  it('throws outside YunQiClientProvider', () => {
    function ClientProbe() {
      useYunQiClient();
      return null;
    }

    expect(() => render(<ClientProbe />)).toThrow(
      'useYunQiClient must be used within YunQiClientProvider',
    );
  });
});
