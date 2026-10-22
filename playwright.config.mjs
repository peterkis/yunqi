import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { defineConfig } from '@playwright/test';

// This timestamp labels test evidence only; it never supplies business time.
const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
const runDirectory = process.env.YUNQI_BROWSER_RUN_DIRECTORY || resolve('.artifacts/browser', runId);
process.env.YUNQI_BROWSER_RUN_DIRECTORY = runDirectory;
const browserChannel = process.env.YUNQI_BROWSER_CHANNEL;
if (browserChannel && !['chrome', 'msedge'].includes(browserChannel)) {
  throw new Error('YUNQI_BROWSER_CHANNEL must be chrome or msedge, or unset for bundled Chromium');
}

const visualProject = (name, width, height, theme = 'light') => ({
  name,
  testMatch: '**/*.visual.spec.mjs',
  use: { viewport: { width, height }, acceptanceTheme: theme },
});

export default defineConfig({
  testDir: './tests/browser',
  globalSetup: './tests/browser/global-setup.mjs',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  outputDir: resolve(runDirectory, 'results'),
  reporter: [
    ['list'],
    ['html', { outputFolder: resolve(runDirectory, 'report'), open: 'never' }],
    ['json', { outputFile: resolve(runDirectory, 'results.json') }],
  ],
  use: {
    browserName: 'chromium',
    channel: browserChannel,
    viewport: { width: 1440, height: 1000 },
    locale: 'zh-CN',
    // A non-Beijing browser zone verifies canonical API time is not reinterpreted.
    timezoneId: 'America/New_York',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
  },
  projects: [
    { name: 'flows-chromium', testMatch: '**/*.flows.spec.mjs' },
    visualProject('desktop-light', 1440, 1000),
    visualProject('breakpoint-light', 1025, 900),
    visualProject('tablet-boundary-light', 768, 900),
    visualProject('tablet-light', 737, 900),
    visualProject('mobile-light', 390, 844),
    visualProject('narrow-light', 320, 800),
    visualProject('desktop-dark', 1440, 1000, 'dark'),
    visualProject('mobile-dark', 390, 844, 'dark'),
  ],
});
