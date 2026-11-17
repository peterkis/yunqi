import AxeBuilder from '@axe-core/playwright';
import { test, expect, loadCurrent, settle, screenshot, expectPanelLayout } from './fixtures.mjs';
import { expectPillGeometry } from './consistency-helpers.mjs';

test('annual absolute descriptions remain inside the scrolling content without growing the document', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/yunqi/year/2024');
  const main = page.getByRole('main', { name: '年度详情', exact: true });
  await expect(main.getByRole('heading', { name: '年度概览', exact: true })).toBeVisible();
  await settle(page);
  await page.evaluate(() => document.fonts.ready);
  await expect(main.locator('.drilldown-stage-selector .visually-hidden')).toHaveCount(6);
  const descriptions = await main.evaluate(content => [...content.querySelectorAll('.drilldown-stage-selector .visually-hidden')].map(description => ({
    position: getComputedStyle(description).position,
    containingBlockInsideContent: content.contains(description.offsetParent),
  })));
  for (const description of descriptions) {
    expect(description).toEqual({ position: 'absolute', containingBlockInsideContent: true });
  }
  const before = await expectPanelLayout(page);
  const scrollTop = await main.evaluate(content => {
    content.scrollTop = content.scrollHeight;
    return content.scrollTop;
  });
  expect(scrollTop).toBeGreaterThan(0);
  const after = await expectPanelLayout(page);
  expect(before.documentHeight).toBe(900);
  expect(after.documentHeight).toBe(900);
  expect(after.header).toEqual(before.header);
  expect(after.footer).toEqual(before.footer);
  await testInfo.attach('annual-scroll-containment', { body: JSON.stringify({ descriptions, before, after }, null, 2), contentType: 'application/json' });
  await screenshot(page, testInfo, 'annual-contained-descriptions');
});

test('control-free inquiry content has a named Tab stop, visible focus and keyboard scrolling', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 400, height: 640 });
  await page.goto('/yunqi/inquiry');
  const main = page.getByRole('main', { name: '问诊规划', exact: true });
  await expect(main.getByRole('heading', { name: '问诊结构化入口', exact: true })).toBeVisible();
  await settle(page);
  await page.evaluate(() => document.fonts.ready);
  await expect(main.locator('button, input, select, textarea, a, [tabindex]')).toHaveCount(0);
  await page.getByRole('button', { name: '返回', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(main).toBeFocused();
  await expect(main).toHaveCSS('outline-width', '2px');
  await expect(main).toHaveCSS('outline-offset', '2px');
  await expect(main).not.toHaveCSS('outline-color', 'rgba(0, 0, 0, 0)');
  await main.evaluate(content => { content.scrollTop = 0; });
  await main.press('PageDown');
  await expect.poll(() => main.evaluate(content => content.scrollTop)).toBeGreaterThan(0);
  await expectPanelLayout(page);
  await page.getByRole('link', { name: '跳至主要内容' }).focus();
  await page.keyboard.press('Enter');
  await expect(main).toBeFocused();
  await expectPanelLayout(page);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  await testInfo.attach('inquiry-scroll-axe-results', { body: JSON.stringify(scan, null, 2), contentType: 'application/json' });
  expect(scan.violations).toEqual([]);
  await screenshot(page, testInfo, 'inquiry-keyboard-scroll');
});

for (const viewport of [{ width: 1366, height: 900 }, { width: 400, height: 860 }, { width: 400, height: 640 }]) {
  for (const theme of ['light', 'dark']) {
    test(`panel ${viewport.width}x${viewport.height} ${theme}: fixed shell, pill and keyboard recovery`, async ({ page, diagnostics }, testInfo) => {
      await page.setViewportSize(viewport);
      const responsePromise = page.waitForResponse(response => response.url().endsWith('/learning/current'));
      await loadCurrent(page);
      const { data } = await (await responsePromise).json();
      await settle(page);
      await page.evaluate(() => document.fonts.ready);
      if (theme === 'dark') await page.getByRole('button', { name: '切换至深色主题' }).click();
      const before = await expectPanelLayout(page);
      const nav = page.getByRole('navigation', { name: '工作台导航', exact: true });
      await expect(nav.getByRole('link')).toHaveText(['当下运气', '先天对照', '体质量表']);
      await expect(nav.locator('[aria-current="page"]')).toHaveText('当下运气');
      for (const control of await page.getByRole('banner').getByRole('button').all()) {
        const bounds = await control.boundingBox();
        expect(bounds.width).toBeGreaterThanOrEqual(32);
        expect(bounds.height).toBeGreaterThanOrEqual(32);
      }
      await expect(page.getByRole('banner')).toContainText('教学参考 · 本次会话不关联患者');
      await expect(page.getByRole('banner')).not.toContainText(/HIS|就诊|年龄/);
      await page.getByRole('contentinfo').evaluate(footer => {
        const range = document.createRange();
        range.selectNodeContents(footer);
        if (new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size !== 1) {
          throw new Error('Footer must remain one meta line at 400px');
        }
      });
      // Scroll the content itself; header, navigation and footer remain stationary.
      const scrollTop = await page.getByRole('main').evaluate(main => {
        main.scrollTop = main.scrollHeight;
        return main.scrollTop;
      });
      expect(scrollTop).toBeGreaterThan(0);
      const scrolled = await expectPanelLayout(page);
      expect(scrolled.header).toEqual(before.header);
      expect(scrolled.navigation).toEqual(before.navigation);
      expect(scrolled.footer).toEqual(before.footer);
      await screenshot(page, testInfo, 'panel-fixed-regions');
      const url = page.url();
      const storageBefore = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
      const requestCount = diagnostics.requests.length;
      const collapse = page.getByRole('button', { name: '收起为胶囊条', exact: true });
      await collapse.focus();
      await page.keyboard.press('Enter');
      // Simulate the future host resizing instead of compressing the pill.
      const collapsedViewport = { width: Math.max(416, viewport.width), height: viewport.height };
      await page.setViewportSize(collapsedViewport);
      const expand = page.getByRole('button', { name: /^展开运气通/ });
      await expect(expand).toBeFocused();
      await expect(expand).toHaveCSS('outline-width', '2px');
      await expect(expand).toHaveCSS('outline-offset', '2px');
      await expect(expand).toHaveCSS('border-radius', '999px');
      await expect(expand).not.toHaveCSS('box-shadow', 'none');
      const pill = await expectPillGeometry(page, expand);
      expect(pill.height).toBe(64);
      await testInfo.attach('pill-geometry', { body: JSON.stringify(pill, null, 2), contentType: 'application/json' });
      await expect(expand).toContainText(data.facts.stemBranch.ganzhi);
      await expect(expand).toContainText(`${data.facts.suiYun.element}运${data.facts.suiYun.state}`);
      await expect(expand).toContainText(`${data.facts.sixQi.sitian}司天`);
      await expect(expand).toContainText(`${data.facts.sixQi.zaiquan}在泉`);
      const step = data.facts.sixQi.steps.find(step => step.index === data.facts.currentStep.index);
      await expect(expand).toContainText(`客气${step.guestQi}`);
      await expect(expand.locator('.ds-relation__chip')).toHaveText(data.currentQi.label);
      await expect(page.getByRole('main')).toHaveCount(0);
      await screenshot(page, testInfo, 'panel-pill');
      const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      await testInfo.attach('pill-axe-results', { body: JSON.stringify(scan, null, 2), contentType: 'application/json' });
      expect(scan.violations).toEqual([]);
      await page.keyboard.press('Space');
      await page.setViewportSize(viewport);
      await expect(collapse).toBeFocused();
      await expect(collapse).toHaveCSS('outline-width', '2px');
      await expect(collapse).toHaveCSS('outline-offset', '2px');
      expect(await page.getByRole('main').evaluate(main => main.scrollTop)).toBe(scrollTop);
      await settle(page);
      expect(diagnostics.requests).toHaveLength(requestCount);
      expect(page.url()).toBe(url);
      expect(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }))).toEqual(storageBefore);
      await collapse.click();
      await page.setViewportSize(collapsedViewport);
      // Mouse activation anywhere on the pill also expands it.
      await expand.click({ position: { x: 180, y: 32 } });
      await page.setViewportSize(viewport);
      await expect(collapse).toBeFocused();
      await collapse.click();
      await page.setViewportSize(collapsedViewport);
      await page.reload();
      await page.setViewportSize(viewport);
      await expect(page.getByRole('main')).toBeVisible();
      await expect(expand).toHaveCount(0);
    });
  }
}

test('segments move focus to content and collapse preserves a birth draft without fetching a summary', async ({ page, diagnostics }) => {
  await loadCurrent(page);
  await page.getByRole('link', { name: '先天对照', exact: true }).click();
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page).toHaveTitle('先天对照 · 运气通');
  const nav = page.getByRole('navigation', { name: '工作台导航', exact: true });
  await expect(nav.locator('[aria-current="page"]')).toHaveText('先天对照');
  const input = page.getByLabel('出生日期（公历）');
  await input.fill('1990-05-12');
  const count = diagnostics.requests.length;
  await page.getByRole('button', { name: '收起为胶囊条' }).click();
  const expand = page.getByRole('button', { name: /^展开运气通/ });
  await expect(expand).toContainText('本视图暂无运气摘要');
  await expand.press('Enter');
  await expect(input).toHaveValue('1990-05-12');
  await settle(page);
  expect(diagnostics.requests).toHaveLength(count);
  await nav.getByRole('link', { name: '体质量表', exact: true }).click();
  await expect(page.getByRole('main')).toBeFocused();
  await expect(nav.locator('[aria-current="page"]')).toHaveText('体质量表');
  await expect(page).toHaveTitle('体质量表 · 运气通');
});

for (const [path, title] of [
  ['/yunqi/year', '年度详情'], ['/yunqi/year/2024', '年度详情'],
  ['/yunqi/year/abc', '年度详情'], ['/yunqi/calculate', '指定时点'],
  ['/yunqi/inquiry', '问诊规划'], ['/not-approved', '页面未找到'],
]) {
  test(`direct drilldown ${path} has a deterministic return`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('navigation', { name: '工作台导航', exact: true })).toHaveCount(0);
    await expect(page.getByRole('region', { name: '页面导航' }).getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page).toHaveTitle(`${title} · 运气通`);
    await page.getByRole('button', { name: '返回', exact: true }).click();
    await expect(page).toHaveURL(/\/yunqi\/current$/);
    await expect(page.getByRole('main')).toBeFocused();
    await expect(page.getByRole('link', { name: '当下运气', exact: true })).toHaveAttribute('aria-current', 'page');
  });
}
