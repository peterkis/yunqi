import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  acceptanceTheme: ['light', { option: true }],
  baseURL: async ({}, use) => {
    const baseURL = process.env.YUNQI_BROWSER_BASE_URL;
    if (!baseURL) throw new Error('Run with the repository Playwright configuration');
    await use(baseURL);
  },
  diagnostics: [async ({ page, browser }, use, testInfo) => {
    const pageErrors = [];
    const consoleMessages = [];
    const requests = [];
    const expectedHttpFailures = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => {
      if (['error', 'warning'].includes(message.type())) {
        consoleMessages.push({ level: message.type(), text: message.text(), url: message.location().url });
      }
    });
    page.on('request', request => {
      if (new URL(request.url()).pathname.startsWith('/api/')) {
        requests.push({ method: request.method(), url: request.url(), body: request.postData() });
      }
    });
    await use({ requests, allowHttpFailure: (path, status) => expectedHttpFailures.push({ path, status }) });
    await testInfo.attach('browser-diagnostics', {
      body: JSON.stringify({ browserVersion: browser.version(), pageErrors, consoleMessages, requests }, null, 2),
      contentType: 'application/json',
    });
    expect(pageErrors, 'No unhandled browser runtime errors').toEqual([]);
    for (const request of requests) {
      expect(new URL(request.url).origin, 'Business requests use the owned frontend origin').toBe(new URL(page.url()).origin);
    }
    const unexpectedConsoleErrors = consoleMessages.filter(message => message.level === 'error').filter(message => !expectedHttpFailures.some(failure => {
      try {
        return new URL(message.url).pathname === failure.path &&
          message.text.startsWith(`Failed to load resource: the server responded with a status of ${failure.status} (`);
      } catch {
        return false;
      }
    }));
    expect(unexpectedConsoleErrors, 'No unexpected browser console errors').toEqual([]);
  }, { auto: true }],
});

export { expect };

export async function settle(page) {
  // Includes completion of async queries and a browser-observed quiet interval.
  await page.waitForLoadState('networkidle');
}

export async function screenshot(page, testInfo, name) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

export async function loadCurrent(page) {
  await page.goto('/');
  await expect(page).toHaveURL(/\/yunqi\/current$/);
  await expect(page.getByRole('heading', { name: '年度概览', exact: true })).toBeVisible();
  await expect(page.locator('.current-yunqi-hero time')).toHaveAttribute(
    'datetime', '2024-01-20T22:07:22+08:00',
  );
}
