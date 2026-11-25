import { readFileSync } from 'node:fs';
import { test, expect, loadCurrent, screenshot } from './fixtures.mjs';
import { expectMotionDurations, expectTransitionDuration, expectImmediateFocusRing } from './motion-helpers.mjs';
import { expectTextContrast } from './visual-assertions.mjs';

const tokens = JSON.parse(readFileSync('docs/design/design-system/tokens.json', 'utf8'));
const surface = name => {
  const value = tokens.color.tokens.find(token => token.name === name).value;
  return typeof value === 'string' ? surface(value.slice(1, -1)) : value;
};
const rgb = hex => `rgb(${[1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)).join(', ')})`;

for (const theme of ['light', 'dark']) {
  test(`craft: ${theme} API time typography, pointer/keyboard theme focus and development host`, async ({ page, motionMode }, testInfo) => {
    await loadCurrent(page);
    const toggle = page.getByRole('button', { name: /^切换至.+主题$/ });
    const glyph = toggle.locator('svg');
    await toggle.hover();
    if (await page.locator('.theme-root').getAttribute('data-motion') === 'full') {
      await expect(glyph).not.toHaveCSS('transform', 'none');
    } else {
      await expect(glyph).toHaveCSS('transform', 'none');
    }
    await expect(glyph).not.toHaveCSS('fill', 'none');
    await page.mouse.move(0, 0);
    await expect(glyph).toHaveCSS('transform', 'none');
    // End with a real mouse click into each theme, keeping the pointer over the
    // icon. A hover background must not masquerade as a retained focus state.
    if (theme === 'light') await toggle.click();
    await toggle.click();
    await expect(page.locator('.theme-root')).toHaveAttribute('data-theme', theme);
    await expect.poll(() => toggle.evaluate(element => element.matches(':focus-visible'))).toBe(false);
    await expect(toggle).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(toggle).toHaveCSS('outline-style', 'none');

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: '收起为胶囊条' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(toggle).toBeFocused();
    await expect.poll(() => toggle.evaluate(element => element.matches(':focus-visible'))).toBe(true);
    await expect(toggle).toHaveCSS('outline-width', '2px');
    await expect(toggle).toHaveCSS('outline-offset', '2px');
    await expect(toggle).toHaveCSS('outline-color', rgb(surface('focus-ring')[theme]));
    await expect(toggle).toHaveCSS('background-color', rgb(surface('accent-subtle')[theme]));

    await expect(page.locator('.current-overview__annual time').first()).toHaveCSS('font-variant-numeric', 'tabular-nums');
    for (const label of await page.locator('.current-overview .ds-info-card__label.num').all()) {
      await expect(label).toHaveCSS('font-variant-numeric', 'tabular-nums');
    }
    const year = page.locator('.current-overview__annual .ds-info-card__label');
    expect(await year.textContent()).toBe('全年\u202f·\u202f2024');
    const quote = page.locator('.current-overview blockquote').first();
    await expect(quote).toContainText('“');
    if (await page.evaluate(() => CSS.supports('text-spacing-trim', 'trim-start'))) {
      await expect(quote).toHaveCSS('text-spacing-trim', 'trim-start');
    }
    for (const selector of ['.ds-segmented-nav__link', '.current-more__chevron']) {
      if (selector === '.current-more__chevron') {
        const level = await page.locator('.theme-root').getAttribute('data-motion');
        await expect(page.locator(selector).first()).toHaveCSS('transition-duration', level === 'full' ? '0.18s' : '0s');
      } else await expectTransitionDuration(page, page.locator(selector).first(), 'fast');
    }
    const disclosure = page.locator('.current-all-stages');
    await disclosure.locator('summary').first().click();
    for (const badge of await disclosure.locator('.current-stage-badge').all()) await expectTextContrast(badge);
    const detail = page.locator('.current-stage-row > [role="region"]:not([hidden])').first();
    await expectTransitionDuration(page, detail);
    if (await page.evaluate(() => CSS.supports('interpolate-size', 'allow-keywords'))) {
      const level = await page.locator('.theme-root').getAttribute('data-motion');
      await expect.poll(() => disclosure.evaluate(element => getComputedStyle(element, '::details-content').transitionDuration.split(',').map(value => value.trim()))).toEqual(level === 'full' ? ['0.18s', '0.18s', '0.18s'] : ['0s']);
    }
    await disclosure.locator('summary').first().click();

    // The browser runner serves the app in Vite DEV. Production exclusion is
    // checked against emitted CSS after every Workbench production build.
    await expect(page.locator('body')).toHaveClass('workbench-dev-host');
    await expect(page.locator('body')).toHaveCSS('background-color', rgb(surface('surface-sunken').light));
    await expect(page.locator('.panel-viewport')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    const panel = page.locator('.panel-shell');
    const card = panel.locator('.current-overview__annual .ds-info-card');
    await expect(panel).toHaveCSS('background-color', rgb(theme === 'light' ? '#f6f7f3' : '#131815'));
    await expect(panel).toHaveCSS('background-image', /radial-gradient.*radial-gradient.*radial-gradient/);
    await expect(card).toHaveCSS('background-image', 'none');
    await expect(card).toHaveCSS('border-color', 'rgba(0, 0, 0, 0)');
    await expect(card).not.toHaveCSS('box-shadow', 'none');
    const main = page.getByRole('main');
    await expect(main).toHaveCSS('background-image', 'none');
    const bounds = await panel.boundingBox();
    const scrollTop = await main.evaluate(node => {
      const before = node.scrollTop;
      node.scrollTop = node.scrollHeight;
      const atBottom = node.scrollTop;
      node.scrollTop = before;
      return atBottom;
    });
    expect(scrollTop).toBeGreaterThan(0);
    expect(await panel.boundingBox()).toEqual(bounds);
    await expectTransitionDuration(page, page.locator('.panel-shell'));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', motionMode === 'off' ? 'off' : 'full');
    await page.getByRole('button', { name: '收起为胶囊条' }).click();
    const pill = page.getByRole('button', { name: /^展开运气通/ });
    for (const selector of ['html', 'body', '#root', '.theme-root', '.panel-viewport']) {
      await expect(page.locator(selector)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    }
    await expectTransitionDuration(page, pill, 'base', true);
    await expect.poll(() => pill.evaluate(element => getComputedStyle(element).transitionTimingFunction.split(',')[0].trim()))
      .toBe((await page.locator('.theme-root').getAttribute('data-motion')) === 'off' ? 'ease' : 'linear');
    await expect(pill).toHaveCSS('opacity', '1');
    await pill.click();
    await expect(page.locator('body')).toHaveCSS('background-color', rgb(surface('surface-sunken').light));
    await expectTransitionDuration(page, page.locator('.panel-shell'));
    await expect(page.locator('.panel-shell')).toHaveCSS('opacity', '1');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', motionMode === 'off' ? 'off' : 'reduced');
    await expectTransitionDuration(page, page.locator('.panel-shell'));
    await screenshot(page, testInfo, `craft-current-${theme}`);

    await page.getByRole('link', { name: '年度详情', exact: true }).click();
    await expect(page.getByRole('combobox', { name: '分析年份' })).toHaveCSS('font-variant-numeric', 'tabular-nums');
  });

  test(`craft: ${theme} motion uses shared tokens, native disclosure and immediate keyboard rings`, async ({ page, motionMode }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/src/test/design-foundations.html');
    if (theme === 'dark') await page.getByRole('button', { name: '切换至深色主题' }).click();
    const selectors = ['.ds-segmented-nav__link', '.ds-segmented-control > button', '.ds-scale-option', '.ds-scale-option__key'];
    for (const selector of selectors) {
      const target = page.locator(selector).first();
      await expectTransitionDuration(page, target, 'fast');
      if (selector !== '.ds-scale-option__key') await expectImmediateFocusRing(page, target);
    }
    const summary = page.locator('.ds-quote-block__summary');
    const details = page.locator('.ds-quote-block__details');
    const fullQuote = details.locator('blockquote');
    await summary.click();
    await expect(details).toHaveAttribute('open', '');
    await expect(fullQuote).toBeVisible();
    if (await page.evaluate(() => CSS.supports('interpolate-size', 'allow-keywords'))) {
      await expect.poll(() => details.evaluate(element => getComputedStyle(element, '::details-content').opacity)).toBe('1');
      await expect.poll(() => details.evaluate(element => getComputedStyle(element, '::details-content').transitionDuration.split(',').map(value => value.trim()))).toEqual((await page.locator('.theme-root').getAttribute('data-motion')) === 'full' ? ['0.18s', '0.18s', '0.18s'] : ['0s']);
    }
    await summary.click();
    await expect(details).not.toHaveAttribute('open');
    await expect(fullQuote).toBeHidden();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', motionMode === 'off' ? 'off' : 'reduced');
    for (const selector of selectors) await expectTransitionDuration(page, page.locator(selector).first(), 'fast');
    await expectMotionDurations(page);
    await expect(summary).toHaveCSS('transition-duration', '0s');
    if (await page.evaluate(() => CSS.supports('interpolate-size', 'allow-keywords'))) {
      await expect.poll(() => details.evaluate(element => getComputedStyle(element, '::details-content').transitionDuration)).toBe('0s');
    }
    // Preserve the same exact keyboard ring expectation when motion is reduced.
    await page.getByRole('button', { name: '返回修改' }).focus();
    await page.keyboard.press('Tab');
    await expect(summary).toBeFocused();
    await expect(summary).toHaveCSS('outline-width', '2px');
    await expect(summary).toHaveCSS('outline-offset', '2px');
  });
}

test('jade surface falls back to a plain canvas when higher contrast is requested', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await loadCurrent(page);
  const panel = page.locator('.panel-shell');
  const card = panel.locator('.current-overview__annual .ds-info-card');
  await expect(panel).toHaveCSS('width', '360px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  const scroller = page.getByRole('main');
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.getByRole('button', { name: '切换至深色主题' }).click();
    await expect(scroller).toHaveCSS('scrollbar-width', 'thin');
    await expect(scroller).not.toHaveCSS('scrollbar-color', 'auto');
    for (const media of [{ contrast: 'more' }, { contrast: 'no-preference', forcedColors: 'active' }]) {
      await page.emulateMedia(media);
      await expect(panel).toHaveCSS('background-image', 'none');
      await expect(scroller).toHaveCSS('scrollbar-width', 'auto');
      await expect(scroller).toHaveCSS('scrollbar-color', 'auto');
      await expect(card).toHaveCSS('box-shadow', 'none');
      await expect(card).not.toHaveCSS('border-color', 'rgba(0, 0, 0, 0)');
      await expect(panel.getByRole('button', { name: '收起为胶囊条' })).toBeVisible();
    }
    await page.emulateMedia({ contrast: 'no-preference', forcedColors: 'none' });
    await expect(panel).toHaveCSS('background-image', /radial-gradient/);
  }
});
