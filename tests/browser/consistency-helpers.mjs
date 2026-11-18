import { expect } from './fixtures.mjs';

export async function expectMoreRows(page) {
  const more = page.getByRole('navigation', { name: '更多运气分析', exact: true });
  const rows = more.locator('.current-more__list > li > a, .current-more__list > li > details > summary');
  await expect(rows).toHaveText(['其余阶段', '年度详情', '指定时点', '计算说明与版本', '动效设置']);
  await expect(async () => {
    const metrics = await rows.evaluateAll(elements => elements.map(element => ({
      height: element.getBoundingClientRect().height,
      tag: element.tagName,
      insideCard: Boolean(element.closest('.ds-info-card')),
      chevrons: element.querySelectorAll('svg[aria-hidden="true"]').length,
    })));
    expect(metrics.map(row => row.tag)).toEqual(['SUMMARY', 'A', 'A', 'SUMMARY', 'SUMMARY']);
    for (const row of metrics) {
      expect(row.height).toBeGreaterThanOrEqual(44);
      expect(row.height).toBe(metrics[0].height);
      expect(row.insideCard).toBe(false);
      expect(row.chevrons).toBe(1);
    }
  }).toPass({ timeout: 10_000 });
  // Borders belong to the list items, so disclosure and anchor target heights match.
  const items = more.locator('.current-more__list > li');
  for (let index = 1; index < 5; index += 1) {
    await expect(items.nth(index)).toHaveCSS('border-top-width', '1px');
    const colors = await items.nth(index).evaluate(element => {
      const swatch = document.createElement('span');
      swatch.style.color = 'var(--border-subtle)';
      element.append(swatch);
      const result = [getComputedStyle(element).borderTopColor, getComputedStyle(swatch).color];
      swatch.remove();
      return result;
    });
    expect(colors[0]).toBe(colors[1]);
  }
}

export async function expectRelationSources(disclosure) {
  await expect(disclosure.locator('ul, li')).toHaveCount(0);
  await expect(disclosure.getByText('教学口径，待专家确认', { exact: false })).toHaveCount(0);
  const sources = disclosure.locator('.learning-source');
  expect(await sources.count()).toBeGreaterThan(0);
  for (const source of await sources.all()) {
    await expect(source).toHaveText(/^《.+》/);
    await expect(source).not.toContainText('新窗口');
    await expect(source).toHaveAccessibleName(/新窗口打开$/);
    await expect(source).toHaveAttribute('target', '_blank');
    await expect(source).toHaveAttribute('rel', 'noreferrer');
    await expect(source).toHaveCSS('font-size', '12px');
    await expect(source.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    await expect(source.locator('svg')).toHaveCSS('width', '12px');
    await expect(source.locator('svg')).toHaveCSS('height', '12px');
    const metrics = await source.evaluate(element => {
      const swatch = document.createElement('span');
      swatch.style.color = 'var(--ink-tertiary)';
      element.append(swatch);
      const result = {
        color: getComputedStyle(element).color, tokenColor: getComputedStyle(swatch).color,
        width: element.getBoundingClientRect().width, rowWidth: element.parentElement.getBoundingClientRect().width,
      };
      swatch.remove();
      return result;
    });
    expect(metrics.color).toBe(metrics.tokenColor);
    expect(Math.abs(metrics.width - metrics.rowWidth)).toBeLessThanOrEqual(1);
  }
}

export async function expectTextLink(page, link) {
  await link.evaluate(element => element.blur());
  await page.mouse.move(0, 0);
  await expect(link).toHaveCSS('text-decoration-line', 'none');
  await link.hover();
  await expect(link).toHaveCSS('text-decoration-line', 'underline');
  await page.mouse.move(0, 0);
  await page.keyboard.press('Tab');
  await link.focus();
  await expect(link).toBeFocused();
  await expect(link).toHaveCSS('text-decoration-line', 'underline');
  await expect(link).toHaveCSS('outline-width', '2px');
  await expect(link).toHaveCSS('outline-offset', '2px');
}

export async function expectClassicsAlignment(page) {
  await expect(async () => {
    const layout = await page.locator('.current-classics').evaluate(view => {
      const bounds = element => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      };
      return {
        panel: bounds(view.closest('.panel-shell')),
        track: bounds(view.querySelector('.current-classics__segments')),
        cards: [...view.querySelectorAll('.current-classics__readings > .classics-card')].map(bounds),
      };
    });
    expect(layout.cards.length).toBeGreaterThan(0);
    expect(layout.track.left - layout.panel.left).toBe(16);
    expect(layout.panel.right - layout.track.right).toBe(16);
    for (const card of layout.cards) {
      expect(Math.abs(card.left - layout.track.left)).toBeLessThanOrEqual(1);
      expect(Math.abs(card.right - layout.track.right)).toBeLessThanOrEqual(1);
    }
  }).toPass({ timeout: 10_000 });
  await page.keyboard.press('Tab');
  const readings = page.locator('.current-classics__readings');
  await readings.focus();
  await expect(readings).toBeFocused();
  await expect(readings).toHaveCSS('outline-width', '2px');
  await expect(readings).toHaveCSS('outline-offset', '2px');
  const focus = await readings.evaluate(region => {
    const rect = region.getBoundingClientRect();
    const main = region.closest('main').getBoundingClientRect();
    const style = getComputedStyle(region);
    const reach = Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset);
    return { left: rect.left - reach - main.left, right: main.right - rect.right - reach,
      top: rect.top - reach - main.top, bottom: main.bottom - rect.bottom - reach };
  });
  for (const clearance of Object.values(focus)) expect(clearance).toBeGreaterThanOrEqual(0);
}

export async function expectPillGeometry(page, pill) {
  let metrics;
  await expect(async () => {
    metrics = await pill.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const mark = element.querySelector('.panel-pill__ganzhi');
      const markRect = mark.getBoundingClientRect();
      const colors = ['--accent', '--accent-on'].map(token => {
        const swatch = document.createElement('span');
        swatch.style.color = `var(${token})`;
        element.append(swatch);
        const color = getComputedStyle(swatch).color;
        swatch.remove();
        return color;
      });
      const swatch = document.createElement('span');
      swatch.style.boxShadow = 'var(--shadow-pill)';
      element.append(swatch);
      const expectedShadow = getComputedStyle(swatch).boxShadow;
      swatch.remove();
      const shadow = getComputedStyle(element).boxShadow.split(/,\s*(?![^()]*\))/).at(-1).trim();
      // CSS blur has no exact visible edge. Record a conservative 3-sigma
      // envelope (sigma = blur / 2), separately from ancestor clipping.
      // The 424x88 standalone host holds the whole tail of shadow-pill (0 2px 8px).
      const [dx, dy, blur, spread] = shadow.match(/-?[\d.]+px/g).map(Number.parseFloat);
      const reach = blur * 1.5 + spread;
      const paint = { left: rect.left + dx - reach, top: rect.top + dy - reach,
        right: rect.right + dx + reach, bottom: rect.bottom + dy + reach };
      const clippingAncestors = [];
      for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        const bounds = ancestor.getBoundingClientRect();
        const clipsX = /(hidden|clip|auto|scroll)/.test(style.overflowX) && (paint.left < bounds.left || paint.right > bounds.right);
        const clipsY = /(hidden|clip|auto|scroll)/.test(style.overflowY) && (paint.top < bounds.top || paint.bottom > bounds.bottom);
        if (clipsX || clipsY) clippingAncestors.push({ tag: ancestor.tagName, className: ancestor.className, clipsX, clipsY });
      }
      return {
        x: rect.x, y: rect.y, width: rect.width, height: rect.height,
        right: innerWidth - rect.right, bottom: innerHeight - rect.bottom,
        viewport: { width: innerWidth, height: innerHeight },
        documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight,
        fits: element.scrollWidth <= element.clientWidth,
        hostBackgrounds: Object.fromEntries(['html', 'body', '#root', '.theme-root', '.panel-viewport'].map(selector => {
          const style = getComputedStyle(document.querySelector(selector));
          return [selector, { color: style.backgroundColor, image: style.backgroundImage }];
        })),
        shadow: { actual: shadow, expected: expectedShadow, blur, spread, reach, clippingAncestors,
          method: '3-sigma envelope: 1.5 * CSS blur + spread; negative clearance means a viewport-clipped blur tail',
          viewportClearance: { left: paint.left, top: paint.top, right: innerWidth - paint.right, bottom: innerHeight - paint.bottom } },
        mark: { width: markRect.width, height: markRect.height, color: getComputedStyle(mark).color,
          background: getComputedStyle(mark).backgroundColor, font: getComputedStyle(mark).fontFamily, colors },
      };
    });
    expect(metrics.width).toBe(400);
    expect(metrics.height).toBe(64);
    expect(metrics.x).toBeGreaterThanOrEqual(12);
    expect(metrics.y).toBe(10);
    expect(metrics.right).toBe(12);
    expect(metrics.bottom).toBeGreaterThanOrEqual(14);
    if (metrics.viewport.width === 424 && metrics.viewport.height === 88) {
      for (const clearance of Object.values(metrics.shadow.viewportClearance)) expect(clearance).toBeGreaterThanOrEqual(0);
    }
    expect(metrics.shadow.actual).toBe(metrics.shadow.expected);
    expect(metrics.shadow.clippingAncestors).toEqual([]);
    for (const background of Object.values(metrics.hostBackgrounds)) {
      expect(background).toEqual({ color: 'rgba(0, 0, 0, 0)', image: 'none' });
    }
    expect(metrics.documentWidth).toBe(metrics.viewport.width);
    expect(metrics.documentHeight).toBe(metrics.viewport.height);
    expect(metrics.fits).toBe(true);
    expect(metrics.mark.width).toBe(44);
    expect(metrics.mark.height).toBe(44);
    expect(metrics.mark.background).toBe(metrics.mark.colors[0]);
    expect(metrics.mark.color).toBe(metrics.mark.colors[1]);
    expect(metrics.mark.font).toContain('Noto Serif SC');
  }).toPass({ timeout: 10_000 });
  return metrics;
}
