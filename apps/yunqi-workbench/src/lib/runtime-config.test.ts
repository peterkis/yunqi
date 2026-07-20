import { describe, expect, it } from 'vitest';
import { readWorkbenchRuntimeConfig } from './runtime-config';

describe('readWorkbenchRuntimeConfig', () => {
  it('uses an empty API base URL when the environment variable is absent', () => {
    expect(readWorkbenchRuntimeConfig({}).apiBaseUrl).toBe('');
  });

  it('trims the configured API base URL', () => {
    expect(
      readWorkbenchRuntimeConfig({
        VITE_YUNQI_API_BASE_URL: ' https://api.test/ ',
      }).apiBaseUrl,
    ).toBe('https://api.test/');
  });
});
