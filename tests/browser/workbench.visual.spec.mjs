import AxeBuilder from '@axe-core/playwright';
import { test, expect, settle, screenshot } from './fixtures.mjs';

const cases = [
  { name: 'current', path: '/yunqi/current', ready: '年度概览' },
  { name: 'annual-entry', path: '/yunqi/year', ready: '年度五运六气分析' },
  { name: 'annual-result', path: '/yunqi/year/2024', ready: '年度概览' },
  { name: 'calculate-entry', path: '/yunqi/calculate', ready: '指定时点分析' },
  { name: 'calculate-result', path: '/yunqi/calculate', ready: '指定时点分析', calculate: true },
  { name: 'inquiry', path: '/yunqi/inquiry', ready: '问诊结构化入口' },
  { name: 'not-found', path: '/yunqi/inquiry/new', ready: '页面未找到' },
];

for (const state of cases) {
  test(`@visual ${state.name}: screenshot, readable layout and accessibility`, async ({ page, acceptanceTheme }, testInfo) => {
    await page.goto(state.path);
    await expect(page.getByRole('heading', { name: state.ready, exact: true })).toBeVisible();
    if (state.calculate) {
      await page.getByLabel('分析时间', { exact: true }).fill('2024-01-20T22:07:22');
      await page.getByRole('button', { name: '开始分析', exact: true }).click();
      await expect(page.getByRole('region', { name: '指定时点分析结果', exact: true })).toBeVisible();
    }
    if (acceptanceTheme === 'dark') {
      await page.getByRole('button', { name: '切换至深色主题', exact: true }).click();
      await expect(page.getByRole('button', { name: '切换至浅色主题', exact: true })).toBeVisible();
    }
    await settle(page);
    await screenshot(page, testInfo, state.name);

    const layout = await page.evaluate(() => {
      const visible = element => element.getClientRects().length > 0;
      const lineCount = element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size;
      };
      const measure = selector => [...document.querySelectorAll(selector)].filter(visible).map(element => ({
        text: element.getAttribute('aria-label') || element.textContent.trim(),
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        lines: lineCount(element),
      }));
      return {
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        overflowingControls: [...document.querySelectorAll('input, select, button')].filter(visible).filter(element => {
          const rect = element.getBoundingClientRect();
          return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1 || element.scrollWidth > element.clientWidth + 1;
        }).map(element => ({ tag: element.tagName, label: element.getAttribute('aria-label') || element.id || element.textContent.trim(), clientWidth: element.clientWidth, scrollWidth: element.scrollWidth })),
        yearSelect: measure('select[aria-label="分析年份"]'),
        stageNames: measure('.annual-six-qi-selector__option strong'),
        stageTimes: measure('.annual-six-qi-selector__range time'),
        currentTitle: measure('.current-yunqi-hero h2'),
      };
    });
    await testInfo.attach('layout-metrics', { body: JSON.stringify(layout, null, 2), contentType: 'application/json' });
    if (state.name === 'annual-entry' || state.name === 'annual-result') {
      expect.soft(layout.yearSelect, 'Annual page retains its year selection control').toHaveLength(1);
    }
    if (state.name === 'annual-result') {
      expect.soft(layout.stageNames, 'Annual result retains all six named stages').toHaveLength(6);
      expect.soft(layout.stageTimes, 'Every annual stage retains both boundary times').toHaveLength(12);
    }
    if (state.name === 'current') expect.soft(layout.currentTitle, 'Current page retains its heading').toHaveLength(1);
    expect.soft(layout.documentWidth, 'Page must not overflow horizontally').toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect.soft(layout.overflowingControls, 'Controls must fit and keep their content readable').toEqual([]);
    for (const control of layout.yearSelect) expect.soft(control.height, 'Year selector has a usable 44 px target').toBeGreaterThanOrEqual(44);
    for (const name of layout.stageNames) expect.soft(name.lines, `Stage name remains readable: ${name.text}`).toBe(1);
    for (const time of layout.stageTimes) expect.soft(time.lines, `Stage time remains on one line: ${time.text}`).toBe(1);
    if (layout.viewportWidth >= 1400) {
      for (const title of layout.currentTitle) expect.soft(title.lines, 'Desktop current heading fits on one line').toBe(1);
    }

    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    await testInfo.attach('axe-results', { body: JSON.stringify(scan, null, 2), contentType: 'application/json' });
    const violations = scan.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map(node => node.target),
    }));
    expect.soft(violations, 'No automatically detected WCAG A/AA violations; full details in axe-results').toEqual([]);
  });
}
