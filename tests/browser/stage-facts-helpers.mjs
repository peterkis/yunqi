import { expect } from './fixtures.mjs';

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

function expectedSubtitle(step, progress, transition) {
  const remaining = progress.remainingCalendarDays === 0
    ? `今日 ${step.end.localTime.slice(11, 16)} ${transition}`
    : `还有 ${progress.remainingCalendarDays} 天`;
  return `${step.startTerm ?? step.startLabel} → ${step.endTerm ?? step.endLabel} · ${remaining}`;
}

export async function expectMovementRelation(region, movement) {
  const { relation, host, guest } = movement;
  const sameElement = relation.elementRelation === 'SAME_ELEMENT';
  const generating = ['HOST_GENERATES_GUEST', 'GUEST_GENERATES_HOST'].includes(relation.direction);
  await expect(region.locator('.ds-relation__chip')).toHaveText(relation.traditionalLabel);
  await expect(region.locator('.ds-relation__chip')).toHaveClass(`ds-relation__chip ds-relation__chip--${!sameElement && generating ? 'favorable' : 'neutral'}`);
  const explanations = {
    NONE: '',
    HOST_GENERATES_GUEST: `主${host.element}生客${guest.element}`,
    GUEST_GENERATES_HOST: `客${guest.element}生主${host.element}`,
    HOST_CONTROLS_GUEST: `主${host.element}克客${guest.element}`,
    GUEST_CONTROLS_HOST: `客${guest.element}克主${host.element}`,
  };
  if (sameElement || relation.direction === 'NONE') {
    await expect(region.locator('.ds-relation__explanation')).toHaveCount(0);
  } else {
    await expect(region.locator('.ds-relation__explanation')).toHaveText(explanations[relation.direction]);
  }
}

export async function expectCurrentStageFacts(page, data) {
  const now = page.locator('.current-overview__now');
  const qi = now.getByRole('region', { name: '当步气', exact: true });
  const movement = now.getByRole('region', { name: '当步运', exact: true });
  await expect(qi.locator('.current-period__subtitle')).toHaveText(expectedSubtitle(data.facts.currentStep, data.facts.currentStepProgress, '交气'));
  await expect(movement.locator('.current-period__subtitle')).toHaveText(expectedSubtitle(data.currentMovement, data.currentMovementProgress, '交运'));
  await expect(qi.locator('time')).toHaveCount(0);
  await expect(movement.locator('time')).toHaveCount(0);
  await expectMovementRelation(movement, data.currentMovement);

  const ratio = data.facts.currentStepProgress.elapsedRatio;
  const progress = now.getByRole('img');
  await expect(progress).toHaveAccessibleName(new RegExp(`第${data.facts.currentStep.index}步${data.facts.currentStep.name}，当前，已过约 ${Math.round(ratio * 100)}%`));
  await expect(page.locator('.current-sixqi-progress__elapsed')).toHaveCount(1);
  const track = page.locator('.current-sixqi-progress .is-current .current-sixqi-progress__bar');
  await expect(async () => {
    const metrics = await track.evaluate(element => {
      const fill = element.querySelector('.current-sixqi-progress__elapsed');
      const bounds = element.getBoundingClientRect();
      const filled = fill.getBoundingClientRect();
      const style = getComputedStyle(fill);
      return { width: bounds.width, filledWidth: filled.width, left: bounds.left, filledLeft: filled.left,
        height: bounds.height, filledHeight: filled.height,
        trackColor: getComputedStyle(element).backgroundColor, fillColor: style.backgroundColor,
        corners: [style.borderTopRightRadius, style.borderBottomRightRadius],
      };
    });
    expect(metrics.width).toBeGreaterThan(0);
    expect(Math.abs(metrics.filledWidth - ratio * metrics.width)).toBeLessThanOrEqual(1);
    expect(metrics.filledLeft).toBe(metrics.left);
    expect(metrics.filledHeight).toBe(metrics.height);
    expect(metrics.fillColor).not.toBe(metrics.trackColor);
    expect(metrics.corners).toEqual(['0px', '0px']);
  }).toPass({ timeout: 10_000 });
  const images = await page.locator('.current-sixqi-progress__bar, .current-sixqi-progress__elapsed')
    .evaluateAll(elements => elements.map(element => getComputedStyle(element).backgroundImage));
  expect(images).toEqual(Array(7).fill('none'));
}
