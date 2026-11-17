import { expect } from './fixtures.mjs';

export async function expectViewControls(page, testInfo) {
  const metrics = await page.evaluate(() => {
    const visible = element => element.checkVisibility({ checkVisibilityCSS: true }) && element.getClientRects().length > 0;
    const measure = element => ({
      label: element.getAttribute('aria-label') || element.textContent.trim(),
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
    });
    const buttons = [...document.querySelectorAll('button')].filter(visible);
    const theme = getComputedStyle(document.querySelector('.theme-root'));
    const swatch = document.createElement('span');
    document.body.append(swatch);
    const accentColors = ['--accent', '--accent-hover'].map(token => {
      swatch.style.color = theme.getPropertyValue(token).trim();
      return getComputedStyle(swatch).color;
    });
    swatch.remove();
    return {
      icons: buttons.filter(element => element.classList.contains('ds-button--icon')).map(measure),
      options: buttons.filter(element => element.classList.contains('ds-scale-option')).map(measure),
      primary: buttons.filter(element => element.classList.contains('ds-button--primary')).map(measure),
      solidAccent: buttons.filter(element => accentColors.includes(getComputedStyle(element).backgroundColor)).map(measure),
    };
  });
  await testInfo.attach('control-metrics', { body: JSON.stringify(metrics, null, 2), contentType: 'application/json' });
  for (const control of metrics.icons) {
    expect(control.width, `Icon target width: ${control.label}`).toBeGreaterThanOrEqual(32);
    expect(control.height, `Icon target height: ${control.label}`).toBeGreaterThanOrEqual(32);
  }
  for (const control of [...metrics.options, ...metrics.primary]) {
    expect(control.height, `Option/primary target height: ${control.label}`).toBeGreaterThanOrEqual(40);
  }
  expect(metrics.primary.length, 'Each view has at most one primary button, including offscreen content').toBeLessThanOrEqual(1);
  expect(metrics.solidAccent.length, 'Each view has at most one solid accent button').toBeLessThanOrEqual(1);
  return metrics;
}

export async function expectFocusRings(page, testInfo) {
  // Focus every available target in keyboard modality, without activating it.
  // Include tabindex=-1 headings/content that receive focus after navigation.
  // Element references must stay in the browser realm to restore nested readers.
  const focusColor = await page.locator('.panel-shell').evaluate(panel => {
    const swatch = document.createElement('span');
    swatch.style.color = 'var(--focus-ring)';
    panel.append(swatch);
    const color = getComputedStyle(swatch).color;
    swatch.remove();
    return color;
  });
  await page.evaluate(() => {
    window.__yunqiFocusCheck = {
      active: document.activeElement,
      scrolls: [...document.querySelectorAll('*')].map(element => [element, element.scrollTop, element.scrollLeft]),
    };
    document.activeElement?.blur();
  });
  await page.keyboard.press('Tab');
  await page.locator('.panel-shell__skip-link').focus();
  const targets = page.locator('button, a[href], input:not([type="hidden"]), select, textarea, summary, [tabindex]');
  const checked = [];
  try {
    for (const target of await targets.all()) {
      if (!await target.isVisible() || !await target.isEnabled()) continue;
      await target.focus();
      await expect(target).toBeFocused();
      // Keep C1/C5's retrying assertions and exact values after demo CSS removal.
      await expect(target).toHaveCSS('outline-width', '2px');
      await expect(target).toHaveCSS('outline-offset', '2px');
      await expect(target).toHaveCSS('outline-style', 'solid');
      await expect(target).toHaveCSS('outline-color', focusColor);
      await expect(target).not.toHaveCSS('outline-color', 'rgba(0, 0, 0, 0)');
      checked.push(await target.evaluate(element => element.getAttribute('aria-label') || element.textContent.trim().slice(0, 80) || element.tagName));
    }
    expect(checked.length, 'Focus gate must exercise real targets').toBeGreaterThan(0);
    await testInfo.attach('focus-targets', { body: JSON.stringify(checked, null, 2), contentType: 'application/json' });
  } finally {
    await page.evaluate(() => {
      const saved = window.__yunqiFocusCheck;
      document.activeElement?.blur();
      saved.active?.focus({ preventScroll: true });
      for (const [element, top, left] of saved.scrolls) { element.scrollTop = top; element.scrollLeft = left; }
      delete window.__yunqiFocusCheck;
    });
  }
}
