import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const test = base.extend({
  acceptanceTheme: ['light', { option: true }],
  motionMode: ['full', { option: true }],
  inFlightProbe: [false, { option: true }],
  page: async ({ page, motionMode, inFlightProbe }, use) => {
    await page.emulateMedia({ reducedMotion: motionMode === 'reduced' ? 'reduce' : 'no-preference' });
    await page.addInitScript(({ mode, sampleInFlight }) => {
      // Frame-rate behavior is tested with fake timestamps in unit tests.
      // Reuse a successful session sample so host load cannot change the
      // selected browser matrix halfway through a functional flow.
      sessionStorage.setItem('yunqi-motion-frame-rate', 'full');
      sessionStorage.setItem('yunqi-motion-frame-in-flight', 'full');
      if (sampleInFlight) {
        // The CPU case owns this opt-in. Clear before the provider reads its
        // initial cache; clearing only after load would leave memory cached.
        sessionStorage.removeItem('yunqi-motion-frame-in-flight');
        sessionStorage.setItem('yunqi-wheel-drawn', 'true');
      }
      if (mode === 'off') {
        const url = new URL(location.href);
        url.searchParams.set('motion', 'off');
        history.replaceState(history.state, '', url);
      }
      if (mode === 'missing-transition') {
        delete document.startViewTransition;
        delete Document.prototype.startViewTransition;
      }
    }, { mode: motionMode, sampleInFlight: inFlightProbe });
    await use(page);
  },
  baseURL: async ({}, use) => {
    const baseURL = process.env.YUNQI_BROWSER_BASE_URL;
    if (!baseURL) throw new Error('Run with the repository Playwright configuration');
    await use(baseURL);
  },
  diagnostics: [async ({ page, context, browser, baseURL }, use, testInfo) => {
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
    const leavesOrigin = value => {
      const url = new URL(value);
      return ['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.host !== new URL(baseURL).host;
    };
    // Block external HTTP resources before they leave the owned environment;
    // the request diagnostic below still makes every attempt fail acceptance.
    await context.route('**/*', route => leavesOrigin(route.request().url()) ? route.abort('blockedbyclient') : route.continue());
    page.on('request', request => {
      const url = new URL(request.url());
      // Hospital networks have no internet: every font, icon, style and script ships with the app.
      if (leavesOrigin(request.url())) {
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

export async function waitForAnimations(page, { timeout = 5_000 } = {}) {
  await page.evaluate(() => document.fonts.ready);
  // Observe natural completion, including @starting-style transitions. A
  // paused or looping effect must time out rather than silently skip the scan.
  await page.waitForFunction(() => document.getAnimations().every(animation => animation.playState === 'finished'), undefined, { polling: 'raf', timeout });
}

export async function scanAccessibility(page) {
  await waitForAnimations(page);
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
}

export function expectNoPersonalDataInUrl(page, motionMode) {
  const parameters = [...new URL(page.url()).searchParams];
  // Motion is read once at startup; SPA navigation may already have removed it.
  // If present, only the exact singleton injected by the off fixture is allowed.
  expect(parameters, 'URL contains no personal data; only the injected motion=off query is permitted')
    .toEqual(motionMode === 'off' && parameters.length > 0 ? [['motion', 'off']] : []);
}

export async function screenshot(page, testInfo, name) {
  // Capture each flow once (off project); every matrix member still runs
  // typography, data, focus, layout and accessibility assertions.
  if (testInfo.project.use.motionMode !== 'off') {
    await expectTypeScale(page, testInfo, name);
    return;
  }
  await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', 'off');
  // Router links may omit the query; preserve this in-memory screen/session
  // and mark the capture URL without reloading or changing its focus.
  await page.evaluate(() => {
    const url = new URL(location.href);
    url.searchParams.set('motion', 'off');
    history.replaceState(history.state, '', url);
  });
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
  // Every visual state, design fixture and flow screenshot shares this gate.
  // Keep the screenshot even if its typography fails so reviewers can inspect it.
  await expectTypeScale(page, testInfo, name);
}

export async function expectTypeScale(page, testInfo, name = 'type-scale') {
  await waitForAnimations(page);
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
        countdown: element.matches('.current-period-grid .current-period-cell--remaining'),
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
  expect(typography.samples.filter(sample => sample.countdown ? sample.size !== 11 : !allowed.includes(sample.size)), 'Visible text uses only the approved type sizes').toEqual([]);
  const tiers = new Set(typography.samples.map(sample => sample.countdown ? 12 : sample.size));
  expect(tiers.size, 'Each screen uses at most five sizes').toBeLessThanOrEqual(5);
  expect(typography.sizes.filter(size => [40, 30, 24].includes(size)).length, 'Each screen uses only one display size').toBeLessThanOrEqual(1);
  return typography;
}

export async function loadCurrent(page) {
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/v1/yunqi/learning/current'));
  await page.goto('/');
  await expect(page).toHaveURL(/\/yunqi\/current(?:\?motion=off)?$/);
  await expect(page.getByRole('region', { name: '全年\u202f·\u202f2024', exact: true })).toBeVisible();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  await expect(page.locator('.current-observed-time')).toHaveCount(0);
  await expect(page.locator('.current-technical time').first()).toHaveAttribute('datetime', data.facts.input.localTime);
  await expectCompactTimes(page);
  return data;
}

/** Result times outside technical details stay compact, including below the fold. */
export async function expectCompactTimes(page) {
  const snapshot = await page.getByRole('main').evaluate(main => {
    const technical = element => element.closest('.current-technical, .birth-technical, .drilldown-technical, .constitution-time-details');
    const text = [];
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const element = node.parentElement;
      if (technical(element) || element.closest('.visually-hidden, script, style, option, .constitution-snapshot[data-kind="current"] time')) continue;
      if (element.matches('.specified-time-anchors button') && node.textContent === '整点 00:00:00') continue;
      if (element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) text.push(node.textContent);
    }
    return {
      text: text.join(' '),
      timeCopy: [main.textContent, ...[...main.querySelectorAll('[aria-label], [title]')].map(element =>
        [element.getAttribute('aria-label'), element.getAttribute('title')].join(' '))].join(' '),
      times: [...main.querySelectorAll('time')].filter(time => !technical(time)).map(time => ({
        dateTime: time.getAttribute('datetime'), text: time.textContent, birthAnchor: Boolean(time.closest('.birth-time-anchors')),
        snapshotTime: Boolean(time.closest('.constitution-snapshot[data-kind="current"]')),
        collapsedStage: Boolean(time.closest('.current-stage-row[data-expanded="false"]')),
      })),
    };
  });
  expect(snapshot.timeCopy, 'Display and accessible copy omit the default time zone').not.toMatch(/北京时间|UTC\s*\+0?8/);
  expect(snapshot.text, 'Main text has no seconds outside calculation details').not.toMatch(/\d{2}:\d{2}:\d{2}/);
  expect(snapshot.text, 'Main text has no milliseconds outside calculation details').not.toMatch(/\.\d{3}/);
  for (const time of snapshot.times) {
    expect(time.dateTime, 'time.dateTime retains full canonical API precision').toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?\+08:00$/);
    if (time.snapshotTime) {
      expect(time.text).toBe(time.dateTime.replace('T', ' ').replace(/\+08:00$/, ''));
      continue;
    }
    const [month, day, clock] = time.dateTime.slice(5, 16).split(/[-T]/);
    if (time.collapsedStage) {
      expect(time.text).toBe(`${month}-${day}`);
    } else {
      expect(time.text).toBe(time.birthAnchor ? `${month}月${day}日 ${clock}` : `${month}-${day} ${clock}`);
    }
  }
}

export async function expectPanelLayout(page) {
  let layout;
  await waitForAnimations(page);
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
        actions: panel.querySelector(':scope > .panel-shell__actions') ? rect(panel.querySelector(':scope > .panel-shell__actions')) : null,
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
    if (layout.actions) {
      // 1-layout.md: optional action area = 40 button + 12 above and below, fixed between content and footer.
      expect(layout.main.bottom).toBe(layout.actions.y);
      expect(layout.actions.height, 'Action area is 40 + 2 × 12').toBe(64);
      expect(layout.actions.bottom).toBe(layout.footer.y);
    } else {
      expect(layout.main.bottom).toBe(layout.footer.y);
    }
    expect(layout.overflowY).toBe('auto');
    expect(layout.mainScrollWidth, 'Content does not scroll horizontally').toBeLessThanOrEqual(layout.mainClientWidth + 1);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport.width + 1);
    expect(layout.documentHeight, 'Only panel content scrolls, including on narrow screens').toBe(Math.max(640, layout.viewport.height));
  }).toPass({ timeout: 10_000 });
  return layout;
}
