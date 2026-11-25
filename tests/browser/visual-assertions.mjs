import { expect, waitForAnimations } from './fixtures.mjs';

export async function expectTextContrast(target, surfaceSelector) {
  const colors = await target.evaluate((element, selector) => {
    const surface = selector ? element.closest(selector) : element;
    return { foreground: getComputedStyle(element).color, background: getComputedStyle(surface).backgroundColor };
  }, surfaceSelector);
  const luminance = color => {
    const channels = color.match(/[\d.]+/g).map(Number);
    expect(channels.length === 3 || channels[3] === 1, 'Contrast samples must be opaque').toBe(true);
    const linear = channels.slice(0, 3).map(channel => {
      const srgb = channel / 255;
      return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const values = [luminance(colors.foreground), luminance(colors.background)].sort((a, b) => a - b);
  const ratio = (values[1] + 0.05) / (values[0] + 0.05);
  expect(ratio, `Text contrast for ${await target.textContent()}`).toBeGreaterThanOrEqual(4.5);
  return ratio;
}

export async function expectElementTitle(value, element, surface) {
  const title = value.locator('.ds-element > span:last-child');
  await expect(value.locator(`.ds-element__dot--${element}`)).toBeVisible();
  const hex = await title.evaluate((node, key) =>
    getComputedStyle(node).getPropertyValue(`--element-${key}-title`).trim(), element);
  expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  const rgb = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
  await expect(title).toHaveCSS('color', `rgb(${rgb.join(', ')})`);
  await expectTextContrast(title, surface);
}

/** K01 gates run in both themes and every panel/workstation visual project. */
export async function expectClassicsCards(page, testInfo) {
  const cards = page.locator('.classics-card:visible');
  expect(await cards.count()).toBeGreaterThan(0);
  const metrics = [];
  for (const card of await cards.all()) {
    const original = card.locator('.classics-card__original > .classics-card__quote');
    const interpretation = card.locator('.classics-card__interpretation > p');
    const badge = card.locator('.classics-card__badge');
    const style = await card.evaluate(element => {
      const css = getComputedStyle(element);
      const current = element.classList.contains('classics-card--current');
      const swatch = document.createElement('span');
      element.append(swatch);
      const color = token => {
        swatch.style.color = `var(${token})`;
        return getComputedStyle(swatch).color;
      };
      const font = token => {
        swatch.style.fontFamily = `var(${token})`;
        return getComputedStyle(swatch).fontFamily;
      };
      const badge = getComputedStyle(element.querySelector('.classics-card__badge'));
      const result = {
        current, border: css.borderTopColor, shadow: css.boxShadow,
        headerBackground: getComputedStyle(element.querySelector('.classics-card__header')).backgroundColor,
        expectedHeader: current ? color('--accent-subtle') : 'rgba(0, 0, 0, 0)',
        badgeBackground: badge.backgroundColor, badgeColor: badge.color,
        expectedBackground: color(current ? '--accent' : '--surface-sunken'),
        expectedColor: color(current ? '--accent-on' : '--ink-secondary'),
        serif: font('--font-serif'), sans: font('--font-sans'),
      };
      swatch.remove();
      return result;
    });
    expect(style.border).toBe('rgba(0, 0, 0, 0)');
    expect(style.shadow).not.toBe('none');
    expect(style.headerBackground).toBe(style.expectedHeader);
    expect(style.badgeBackground).toBe(style.expectedBackground);
    expect(style.badgeColor).toBe(style.expectedColor);
    await expect(badge).toHaveCSS('height', '22px');
    await expect(original).toHaveCSS('font-family', style.serif);
    await expect(interpretation).toHaveCSS('font-family', style.sans);
    await expect(card.locator('.classics-card__body > *')).toHaveClass([
      'classics-card__original', 'classics-card__interpretation', 'classics-card__source',
    ]);
    await expect(card.locator('.classics-card__original > h4')).toHaveText('原 文');
    await expect(card.locator('.classics-card__interpretation > h4')).toHaveText('释 义');
    await expect(card.locator('.classics-card__opening').first()).toHaveAttribute('aria-hidden', 'true');
    await expect(card.locator('.classics-card__source > p > span')).toHaveCount(2);
    await expect(card.getByRole('link', { name: /^出处/ })).toHaveAttribute('target', '_blank');
    const contrasts = [];
    for (const label of await card.locator('.classics-card__label').all()) contrasts.push(await expectTextContrast(label));
    contrasts.push(await expectTextContrast(badge));
    metrics.push({ ...style, contrasts });
  }
  if (testInfo) await testInfo.attach('classics-card-metrics', { body: JSON.stringify(metrics, null, 2), contentType: 'application/json' });
}

export async function expectViewControls(page, testInfo) {
  await waitForAnimations(page);
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
  const calculate = await page.locator('.panel-shell').getAttribute('data-route') === 'calculate';
  const checked = [];
  try {
    for (const target of await targets.all()) {
      if (!await target.isVisible() || !await target.isEnabled()) continue;
      await target.focus();
      await expect(target).toBeFocused();
      if (calculate) {
        await expect(target).toHaveCSS('outline-style', 'none');
        await expect.poll(() => target.evaluate(el => {
          const picker = el.closest('.specified-time-picker');
          if (picker || el.matches('.ds-button--icon, .numeric-keypad button:has(svg)')) {
            const icon = picker ?? el;
            return getComputedStyle(icon).outlineStyle === 'none' &&
              getComputedStyle(icon, '::after').borderBottomWidth === '2px';
          }
          if (el.matches('.specified-time-segments input')) {
            const css = getComputedStyle(el);
            return el.hasAttribute('data-active') && (css.boxShadow.includes('inset') || css.borderBottomWidth === '2px');
          }
          const label = el.matches('main') ? el.querySelector('.specified-time-intro h1') : el;
          return getComputedStyle(label).textDecorationLine.includes('underline');
        })).toBe(true);
        checked.push(await target.getAttribute('aria-label') || await target.textContent());
        continue;
      }
      if (await target.evaluate(element => element.matches(':is(h3.constitution-question-title, h4.constitution-result-title)[tabindex="-1"]'))) {
        // Only the two programmatic announcement headings use a ringless focus.
        await expect(target).toHaveCSS('outline-style', 'none');
        checked.push('heading announcement: no outline');
        continue;
      }
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
