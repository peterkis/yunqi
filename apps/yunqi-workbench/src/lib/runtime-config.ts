export interface WorkbenchRuntimeEnv {
  readonly [key: string]: unknown;
  readonly VITE_YUNQI_API_BASE_URL?: string;
}

export function readWorkbenchRuntimeConfig(env: WorkbenchRuntimeEnv) {
  return {
    apiBaseUrl: env.VITE_YUNQI_API_BASE_URL?.trim() ?? '',
  } as const;
}
