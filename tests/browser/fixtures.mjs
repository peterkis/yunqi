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
  // Every visual state, design fixture and flow screenshot shares this gate.
  // Keep the screenshot even if its typography fails so reviewers can inspect it.
  await expectTypeScale(page, testInfo, name);
}

export async function expectTypeScale(page, testInfo, name = 'type-scale') {
  await page.evaluate(() => document.fonts.ready);
  const typography = await page.evaluate(() => {
    const samples = [];
    const sample = (element, text, rects) => {
      if (element.closest('script, style, template, option, .visually-hidden')) return;
      if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return;
      const bounds = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
      // Range rectangles also exist for text clipped by scrolling containers
      // and the unfocused skip link. Count only text actually on this screen.
      for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        const rect = ancestor.getBoundingClientRect();
        if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
          bounds.left = Math.max(bounds.left, rect.left + ancestor.clientLeft);
          bounds.right = Math.min(bounds.right, rect.left + ancestor.clientLeft + ancestor.clientWidth);
        }
        if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
          bounds.top = Math.max(bounds.top, rect.top + ancestor.clientTop);
          bounds.bottom = Math.min(bounds.bottom, rect.top + ancestor.clientTop + ancestor.clientHeight);
        }
      }
      if (!rects.some(rect => rect.width > 0 && rect.height > 0 &&
        Math.min(rect.right, bounds.right) > Math.max(rect.left, bounds.left) &&
        Math.min(rect.bottom, bounds.bottom) > Math.max(rect.top, bounds.top))) return;
      samples.push({
        element: `${element.tagName.toLowerCase()}.${element.getAttribute('class') || ''}`,
        text: text.trim().slice(0, 100), size: Number.parseFloat(getComputedStyle(element).fontSize),
      });
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      sample(node.parentElement, node.textContent, [...range.getClientRects()]);
    }
    // Native control values/placeholder text are not DOM text nodes.
    for (const element of document.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]), select, textarea')) {
      const text = element.tagName === 'SELECT'
        ? element.selectedOptions[0]?.textContent : element.value || element.placeholder;
      if (text) sample(element, text, [...element.getClientRects()]);
    }
    return { samples, sizes: [...new Set(samples.map(sample => sample.size))].sort((a, b) => a - b) };
  });
  if (testInfo) await testInfo.attach(`typography-${name}`, { body: JSON.stringify(typography, null, 2), contentType: 'application/json' });
  const allowed = [40, 30, 24, 20, 15, 14, 12];
  expect(typography.samples.length, 'Typography gate must inspect visible text').toBeGreaterThan(0);
  expect(typography.samples.filter(sample => !allowed.includes(sample.size)), 'Visible text uses only the approved type sizes').toEqual([]);
  expect(typography.sizes.length, 'Each screen uses at most five sizes').toBeLessThanOrEqual(5);
  expect(typography.sizes.filter(size => [40, 30, 24].includes(size)).length, 'Each screen uses only one display size').toBeLessThanOrEqual(1);
  return typography;
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
  let layout;
  // Retry one complete measurement with the existing 10s assertion budget.
  await expect(async () => {
    layout = await page.evaluate(() => {
      const panel = document.querySelector('.panel-shell');
      const main = panel.querySelector(':scope > main');
      const rect = element => {
        const { x, y, width, height, right, bottom } = element.getBoundingClientRect();
        return { x, y, width, height, right, bottom };
      };
      return {
        viewport: { width: innerWidth, height: innerHeight },
        panel: rect(panel), header: rect(panel.querySelector(':scope > header')),
        navigation: rect(panel.querySelector(':scope > .panel-shell__navigation')),
        main: rect(main), footer: rect(panel.querySelector(':scope > footer')),
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
  }).toPass({ timeout: 10_000 });
  return layout;
}
