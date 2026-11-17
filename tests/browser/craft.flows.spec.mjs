import { readFileSync } from 'node:fs';
import { test, expect, loadCurrent, screenshot } from './fixtures.mjs';

const tokens = JSON.parse(readFileSync('docs/design/design-system/tokens.json', 'utf8'));
const surface = name => {
  const value = tokens.color.tokens.find(token => token.name === name).value;
  return typeof value === 'string' ? surface(value.slice(1, -1)) : value;
};
const rgb = hex => `rgb(${[1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)).join(', ')})`;

for (const theme of ['light', 'dark']) {
  test(`craft: ${theme} API time typography, pointer/keyboard theme focus and development host`, async ({ page }, testInfo) => {
    await loadCurrent(page);
    const toggle = page.getByRole('button', { name: /^切换至.+主题$/ });
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
    await expect(toggle).toHaveCSS('background-color', rgb(surface('surface-sunken')[theme]));

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
      await expect(page.locator(selector).first()).toHaveCSS('transition-duration', '0s');
    }
    const disclosure = page.locator('.current-all-stages');
    await disclosure.locator('summary').first().click();
    const detail = page.locator('.current-stage-row > [role="region"]:not([hidden])').first();
    await expect(detail).toHaveCSS('transition-duration', '0s');
    if (await page.evaluate(() => CSS.supports('interpolate-size', 'allow-keywords'))) {
      await expect.poll(() => disclosure.evaluate(element => getComputedStyle(element, '::details-content').transitionDuration)).toBe('0s');
    }
    await disclosure.locator('summary').first().click();

    // The browser runner serves the app in Vite DEV. Production exclusion is
    // checked against emitted CSS after every Workbench production build.
    await expect(page.locator('body')).toHaveClass('workbench-dev-host');
    await expect(page.locator('body')).toHaveCSS('background-color', rgb(surface('surface-sunken').light));
    await expect(page.locator('.panel-viewport')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(page.locator('.panel-shell')).toHaveCSS('background-color', rgb(surface('surface-page')[theme]));
    await expect(page.locator('.panel-shell')).toHaveCSS('transition-duration', '0s');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: '收起为胶囊条' }).click();
    const pill = page.getByRole('button', { name: /^展开运气通/ });
    await expect(pill).toHaveCSS('transition-duration', '0.14s');
    await expect(pill).toHaveCSS('transition-timing-function', 'ease-out');
    await expect(pill).toHaveCSS('opacity', '1');
    await pill.click();
    await expect(page.locator('.panel-shell')).toHaveCSS('transition-duration', '0.14s');
    await expect(page.locator('.panel-shell')).toHaveCSS('opacity', '1');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('.panel-shell')).toHaveCSS('transition-duration', '0s');
    await screenshot(page, testInfo, `craft-current-${theme}`);

    await page.getByRole('link', { name: '年度详情', exact: true }).click();
    await expect(page.getByRole('combobox', { name: '分析年份' })).toHaveCSS('font-variant-numeric', 'tabular-nums');
  });

  test(`craft: ${theme} normal motion uses brief ease-out transitions and reduced motion cancels them`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/src/test/design-foundations.html');
    if (theme === 'dark') await page.getByRole('button', { name: '切换至深色主题' }).click();
    const selectors = ['.ds-segmented-nav__link', '.ds-segmented-control > button', '.ds-scale-option', '.ds-scale-option__key'];
    for (const selector of selectors) {
      const target = page.locator(selector).first();
      await expect.poll(() => target.evaluate(element => {
        const style = getComputedStyle(element);
        return style.transitionDuration.split(',').every(value => Number.parseFloat(value) >= 0.12 && Number.parseFloat(value) <= 0.16)
          && style.transitionTimingFunction.split(',').every(value => value.trim() === 'ease-out')
          && !style.transitionProperty.includes('outline');
      })).toBe(true);
    }
    const summary = page.locator('.ds-quote-block__summary');
    const details = page.locator('.ds-quote-block__details');
    const fullQuote = details.locator('blockquote');
    await summary.click();
    await expect(details).toHaveAttribute('open', '');
    await expect(fullQuote).toBeVisible();
    if (await page.evaluate(() => CSS.supports('interpolate-size', 'allow-keywords'))) {
      await expect.poll(() => details.evaluate(element => getComputedStyle(element, '::details-content').opacity)).toBe('1');
      await expect.poll(() => details.evaluate(element => getComputedStyle(element, '::details-content').transitionDuration.split(',').map(value => value.trim()))).toEqual(['0.14s', '0.14s', '0.14s']);
    }
    await summary.click();
    await expect(details).not.toHaveAttribute('open');
    await expect(fullQuote).toBeHidden();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const selector of selectors) await expect(page.locator(selector).first()).toHaveCSS('transition-duration', '0s');
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
