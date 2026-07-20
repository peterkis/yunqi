import {
  createFetchTransport,
  createYunQiClient,
  type YunQiClient,
} from '@yunqi/client';
import {
  createContext,
  type PropsWithChildren,
  useContext,
} from 'react';
import { readWorkbenchRuntimeConfig } from '../lib/runtime-config';

const runtimeConfig = readWorkbenchRuntimeConfig(import.meta.env);
const defaultClient = createYunQiClient(
  createFetchTransport({ baseUrl: runtimeConfig.apiBaseUrl }),
);
const YunQiClientContext = createContext<YunQiClient | undefined>(
  undefined,
);

export interface YunQiClientProviderProps extends PropsWithChildren {
  readonly client?: YunQiClient;
}

export function YunQiClientProvider({
  children,
  client = defaultClient,
}: YunQiClientProviderProps) {
  return (
    <YunQiClientContext value={client}>
      {children}
    </YunQiClientContext>
  );
}

export function useYunQiClient(): YunQiClient {
  const client = useContext(YunQiClientContext);

  if (client === undefined) {
    throw new Error(
      'useYunQiClient must be used within YunQiClientProvider',
    );
  }

  return client;
}
