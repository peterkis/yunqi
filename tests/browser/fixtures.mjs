import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  acceptanceTheme: ['light', { option: true }],
  baseURL: async ({}, use) => {
    const baseURL = process.env.YUNQI_BROWSER_BASE_URL;
    if (!baseURL) throw new Error('Run with the repository Playwright configuration');
    await use(baseURL);
  },
  diagnostics: [async ({ page, browser, baseURL }, use, testInfo) => {
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
    const externalRequests = [];
    page.on('request', request => {
      const url = new URL(request.url());
      // Hospital networks have no internet: every font, icon, style and script ships with the app.
      if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.host !== new URL(baseURL).host) {
        externalRequests.push({ method: request.method(), url: request.url(), resourceType: request.resourceType() });
      }
      if (url.pathname.startsWith('/api/')) {
        requests.push({ method: request.method(), url: request.url(), body: request.postData() });
      }
    });
    await use({ requests, allowHttpFailure: (path, status) => expectedHttpFailures.push({ path, status }) });
    await testInfo.attach('browser-diagnostics', {
      body: JSON.stringify({ browserVersion: browser.version(), pageErrors, consoleMessages, requests, externalRequests }, null, 2),
      contentType: 'application/json',
    });
    expect(pageErrors, 'No unhandled browser runtime errors').toEqual([]);
    expect(externalRequests, 'No request leaves the owned origin (fonts, icons, styles and scripts ship locally)').toEqual([]);
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
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/v1/yunqi/learning/current'));
  await page.goto('/');
  await expect(page).toHaveURL(/\/yunqi\/current$/);
  await expect(page.getByRole('region', { name: '全年 · 2024', exact: true })).toBeVisible();
  await expect(page.locator('.current-observed-time time')).toHaveAttribute(
    'datetime', '2024-01-20T22:07:22+08:00',
  );
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}

export async function expectPanelLayout(page) {
  const layout = await page.evaluate(() => {
    const panel = document.querySelector('.panel-shell');
    const main = panel.querySelector('main');
    const rect = element => {
      const { x, y, width, height, right, bottom } = element.getBoundingClientRect();
      return { x, y, width, height, right, bottom };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      panel: rect(panel), header: rect(panel.querySelector(':scope > header')),
      navigation: rect(panel.querySelector('.panel-shell__navigation')),
      main: rect(main), footer: rect(panel.querySelector('footer')),
      mainClientWidth: main.clientWidth, mainScrollWidth: main.scrollWidth,
      overflowY: getComputedStyle(main).overflowY,
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
    };
  });
  expect(layout.panel.width, 'Panel is 400px, or fits an explicitly narrower viewport').toBe(Math.min(400, layout.viewport.width));
  expect(layout.panel.right, 'Panel docks on the viewport right edge').toBe(layout.viewport.width);
  expect(layout.panel.y).toBe(0);
  expect(layout.panel.height).toBe(Math.max(640, layout.viewport.height));
  expect(layout.header.height).toBe(52);
  expect(layout.footer.height).toBe(36);
  expect(layout.footer.bottom).toBe(layout.panel.bottom);
  expect(layout.main.y).toBe(layout.navigation.bottom);
  expect(layout.main.bottom).toBe(layout.footer.y);
  expect(layout.overflowY).toBe('auto');
  expect(layout.mainScrollWidth, 'Content does not scroll horizontally').toBeLessThanOrEqual(layout.mainClientWidth + 1);
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport.width + 1);
  expect(layout.documentHeight, 'Only panel content scrolls, including on narrow screens').toBe(Math.max(640, layout.viewport.height));
  return layout;
}
