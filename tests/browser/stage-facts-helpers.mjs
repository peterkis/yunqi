import { expect, waitForAnimations } from './fixtures.mjs';

const QI_TONES = {
  '顺 · 君位臣': 'favorable', '相生 · 相得': 'favorable', '顺 · 客胜主': 'favorable',
  '逆 · 臣位君': 'adverse', '逆 · 主胜客': 'adverse', 同气: 'neutral',
};

// Replay an unmodified, real Service calculation at the current endpoint so the
// current page can be exercised at nonzero progress and same-day boundaries.
export async function useCalculatedCurrentSnapshot(page, dateTime) {
  await page.route('**/api/v1/yunqi/learning/current', async route => {
    const response = await route.fetch({
      url: new URL('/api/v1/yunqi/learning/calculate', route.request().url()).href,
      method: 'POST',
      postData: { dateTime },
    });
    expect(response.status()).toBe(200);
    await route.fulfill({ response });
  });
}

function expectedPeriodLabels(step, progress, transition) {
  const remaining = progress.remainingCalendarDays === 0
    ? `今日 ${step.end.localTime.slice(11, 16)} ${transition}`
    : `还有 ${progress.remainingCalendarDays} 天`;
  return { range: `${step.startTerm ?? step.startLabel} → ${step.endTerm ?? step.endLabel}`, remaining };
}

export async function expectStageDividerAlignment(detail) {
  const divider = detail.locator('.current-stage-comparison__divider');
  await expect(divider).toHaveCSS('align-items', 'center');
  const metrics = await divider.evaluate(node => {
    const row = node.getBoundingClientRect();
    const chip = node.querySelector('.ds-relation__chip').getBoundingClientRect();
    return {
      centerOffset: Math.abs((chip.top + chip.bottom - row.top - row.bottom) / 2),
      lineLengths: ['::before', '::after'].map(side => parseFloat(getComputedStyle(node, side).width)),
    };
  });
  expect(metrics.centerOffset).toBeLessThanOrEqual(0.5);
  for (const length of metrics.lineLengths) expect(length).toBeGreaterThan(0);

  const direction = detail.locator('.current-stage-comparison__direction');
  if (await direction.count()) {
    const box = await direction.boundingBox();
    const badge = await divider.locator('.ds-relation__chip').boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(badge.y + 1);
    expect(Math.abs(box.x + box.width / 2 - badge.x - badge.width / 2)).toBeLessThanOrEqual(1);
    const [host, guest] = await detail.locator('.current-stage-comparison dt').evaluateAll(labels => labels.map(label => {
      const range = document.createRange();
      range.selectNodeContents(label);
      return range.getBoundingClientRect().toJSON();
    }));
    expect(box.x).toBeGreaterThan(host.right);
    expect(box.x + box.width).toBeLessThan(guest.left);
  }
}

export async function expectStageHeadingAlignment(row) {
  const centers = await row.evaluate(node => {
    const center = selector => {
      const rect = node.querySelector(selector).getBoundingClientRect();
      return rect.y + rect.height / 2;
    };
    return [
      center('h3'), center('.current-stage-status, .current-stage-badge'), center('.current-time-range'),
    ];
  });
  for (const center of centers.slice(1)) expect(Math.abs(center - centers[0])).toBeLessThanOrEqual(1);
}

export async function expectStageNode(button, current, expanded) {
  await expect(button).toHaveAttribute('aria-expanded', String(expanded));
  if (current) await expect(button).toHaveAttribute('aria-current', 'step');
  else await expect(button).not.toHaveAttribute('aria-current', 'step');
  await expect.poll(() => button.evaluate(node => {
    const point = node.querySelector('.current-stage-navigation__point');
    const label = getComputedStyle(node.querySelector('.current-stage-navigation__label'));
    const dot = getComputedStyle(point);
    const seed = getComputedStyle(point, '::before');
    const pointer = getComputedStyle(point, '::after');
    const shadow = dot.boxShadow;
    return {
      seed: seed.content !== 'none',
      triangle: pointer.content !== 'none' && pointer.clipPath.startsWith('polygon'),
      halo: shadow !== 'none' && shadow.split(/,(?![^()]*\))/).some(layer => !layer.includes('inset')),
      rings: (shadow.match(/inset/g) ?? []).length,
      capsule: label.backgroundColor !== 'rgba(0, 0, 0, 0)',
      bold: Number(label.fontWeight) >= 600,
    };
  })).toEqual({
    seed: !current, triangle: expanded && !current, halo: current,
    rings: expanded ? (current ? 2 : 0) : 1, capsule: current && expanded, bold: current || expanded,
  });
}

export async function expectMovementRelation(region, movement) {
  const { relation, host, guest } = movement;
  // YQ-LEARNING-RULES-1.3.0 (expert-confirmed): 相得 and 客胜主=顺 are favorable,
  // 主胜客=逆 is adverse, a shared element is neutral.
  const tones = {
    NONE: 'neutral',
    HOST_GENERATES_GUEST: 'favorable',
    GUEST_GENERATES_HOST: 'favorable',
    GUEST_CONTROLS_HOST: 'favorable',
    HOST_CONTROLS_GUEST: 'adverse',
  };
  await expect(region.locator('.ds-relation__chip')).toHaveText(relation.traditionalLabel);
  await expect(region.locator('.ds-relation__chip')).toHaveClass(`ds-relation__chip ds-relation__chip--${tones[relation.direction]}`);
  const explanations = {
    NONE: '',
    HOST_GENERATES_GUEST: `主${host.element}生客${guest.element}`,
    GUEST_GENERATES_HOST: `客${guest.element}生主${host.element}`,
    HOST_CONTROLS_GUEST: `主${host.element}克客${guest.element}`,
    GUEST_CONTROLS_HOST: `客${guest.element}克主${host.element}`,
  };
  if (relation.elementRelation === 'SAME_ELEMENT' || relation.direction === 'NONE') {
    await expect(region.locator('.ds-relation__explanation')).toHaveCount(0);
  } else {
    await expect(region.locator('.ds-relation__explanation')).toHaveText(explanations[relation.direction]);
  }
}

export async function expectCurrentStageFacts(page, data) {
  const now = page.locator('.current-overview__now');
  const qi = now.getByRole('region', { name: '当步气', exact: true });
  const movement = now.getByRole('region', { name: '当步运', exact: true });
  for (const [region, step, progress, transition] of [
    [qi, data.facts.currentStep, data.facts.currentStepProgress, '交气'],
    [movement, data.currentMovement, data.currentMovementProgress, '交运'],
  ]) {
    const labels = expectedPeriodLabels(step, progress, transition);
    await expect(region.locator('.current-period-cell--range')).toHaveText(labels.range);
    await expect(region.locator('.current-period-cell--remaining')).toHaveText(labels.remaining);
    await expect(region.locator('.current-period-cell--remaining')).toHaveCSS('font-size', '11px');
  }
  await expect(qi.locator('time')).toHaveCount(0);
  await expect(movement.locator('time')).toHaveCount(0);
  await expect(qi.locator('.current-period-cell--value .ds-element')).toHaveText([data.facts.currentStep.hostQi, data.facts.currentStep.guestQi]);
  await expect(movement.locator('.current-period-cell--value .ds-element')).toHaveText([
    `${data.currentMovement.host.element}运${data.currentMovement.host.state}`,
    `${data.currentMovement.guest.element}运${data.currentMovement.guest.state}`,
  ]);
  await expect(qi.locator('.ds-relation__chip')).toHaveText(data.currentQi.label);
  await expect(qi.locator('.ds-relation__chip')).toHaveClass(`ds-relation__chip ds-relation__chip--${QI_TONES[data.currentQi.label]}`);
  await expect(qi.locator('.ds-relation__explanation')).toHaveText(data.currentQi.relation);
  await expectMovementRelation(movement, data.currentMovement);

  const ratio = data.facts.currentStepProgress.elapsedRatio;
  const wheel = page.locator('.current-year-wheel').getByRole('img');
  await expect(wheel).toHaveAccessibleName(`年轮：外环六步气，当前第${data.facts.currentStep.index}步${data.facts.currentStep.name}，已过约 ${Math.round(ratio * 100)}%；内环五步运，当前第${data.currentMovement.index}运${data.currentMovement.name}，已过约 ${Math.round(data.currentMovementProgress.elapsedRatio * 100)}%`);
  await expect(wheel.locator('[data-ring="qi"] path')).toHaveCount(6);
  await expect(wheel.locator('[data-ring="movement"] path')).toHaveCount(5);
  for (const [ring, index, token] of [
    ['qi', data.facts.currentStep.index, '--accent'],
    ['movement', data.currentMovement.index, '--relation-favorable-fg'],
  ]) {
    const current = wheel.locator(`[data-ring="${ring}"] .is-current`);
    await expect(current).toHaveCount(1);
    await expect(current).toHaveAttribute('data-index', String(index));
    const path = ring === 'qi' ? current.locator('path') : current;
    const colors = await path.evaluate((element, token) => {
      const swatch = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      swatch.style.fill = `var(${token})`;
      element.parentElement.append(swatch);
      const values = [getComputedStyle(element).fill, getComputedStyle(swatch).fill];
      swatch.remove();
      return values;
    }, token);
    expect(colors[0]).toBe(colors[1]);
  }
  await expect(wheel.locator('linearGradient, clipPath, mask')).toHaveCount(0);
  await expect(now.locator('.ds-info-card__eyebrow')).toHaveCount(0);
  await expect(now.getByText('北京时间 UTC+08', { exact: true })).toHaveCount(0);
  await expect(page.locator('.current-sixqi-progress, .current-sixqi-progress__elapsed')).toHaveCount(0);
  await expectCurrentPeriodAlignment(page);
}

export async function expectCurrentPeriodAlignment(page) {
  const grid = page.locator('.current-period-grid');
  await expect(grid).toHaveCSS('display', 'grid');
  await expect(grid.locator('.current-period-cell')).toHaveCount(12);
  const qi = grid.getByRole('region', { name: '当步气', exact: true });
  const movement = grid.getByRole('region', { name: '当步运', exact: true });
  await expect(qi).toHaveCSS('display', 'contents');
  await expect(movement).toHaveCSS('display', 'contents');
  await waitForAnimations(page);
  await expect(async () => {
    for (let row = 0; row < 6; row += 1) {
      const [left, right] = await Promise.all([
        qi.locator('.current-period-cell').nth(row).boundingBox(),
        movement.locator('.current-period-cell').nth(row).boundingBox(),
      ]);
      expect(left, `Qi row ${row + 1} has a box`).not.toBeNull();
      expect(right, `Movement row ${row + 1} has a box`).not.toBeNull();
      expect(Math.abs(left.y - right.y), `Period row ${row + 1} aligns within one pixel`).toBeLessThanOrEqual(1);
    }
    const columns = await grid.locator('.current-period-column').evaluateAll(regions => regions.map(region => {
      const header = region.querySelector('.current-period-cell--title').getBoundingClientRect();
      const badge = region.querySelector('.current-period-cell--remaining').getBoundingClientRect();
      const heading = region.querySelector('h3').getBoundingClientRect();
      const center = header.left + header.width / 2;
      const offsets = [...region.querySelectorAll('.current-period-cell--range, .current-meta, .ds-element, .ds-relation__chip, .ds-relation__explanation')].map(node => {
        // Measure the text itself for full-width blocks, and the dot/chip as a group.
        const range = document.createRange();
        range.selectNodeContents(node);
        const rect = node.matches('.ds-element, .ds-relation__chip') ? node.getBoundingClientRect() : range.getBoundingClientRect();
        return { text: node.textContent, offset: Math.abs(rect.left + rect.width / 2 - center) };
      });
      return { badgeTop: badge.top, headingTop: heading.top, rightGap: header.right - badge.right,
        leftGap: heading.left - header.left, fits: heading.right <= badge.left && badge.right <= header.right + 1, offsets };
    }));
    expect(Math.abs(columns[0].badgeTop - columns[1].badgeTop), 'Countdowns share a top edge').toBeLessThanOrEqual(1);
    expect(Math.abs(columns[0].headingTop - columns[1].headingTop), 'Headings share a row').toBeLessThanOrEqual(1);
    for (const column of columns) {
      expect(column.fits).toBe(true);
      expect(Math.abs(column.leftGap)).toBeLessThanOrEqual(1);
      expect(Math.abs(column.headingTop - column.badgeTop)).toBeLessThanOrEqual(1);
      expect(Math.abs(column.rightGap)).toBeLessThanOrEqual(1);
      for (const item of column.offsets) expect(item.offset, item.text).toBeLessThanOrEqual(1);
    }
  }).toPass({ timeout: 10_000 });
}
