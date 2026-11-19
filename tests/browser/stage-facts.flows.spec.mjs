import { test, expect, screenshot, expectCompactTimes, scanAccessibility, waitForAnimations } from './fixtures.mjs';
import { expectCurrentStageFacts, useCalculatedCurrentSnapshot } from './stage-facts-helpers.mjs';

for (const [name, dateTime] of [
  ['elapsed-stage', '2026-11-18T08:44:00+08:00'],
  ['qi-ends-today', '2026-11-22T00:00:00+08:00'],
  ['qi-and-movement-end-today', '2027-01-20T00:00:00+08:00'],
]) {
  test(`stage facts: ${name} shows a real snapshot in the year wheel and seven aligned rows`, async ({ page }, testInfo) => {
    await useCalculatedCurrentSnapshot(page, dateTime);
    const responsePromise = page.waitForResponse(response => response.url().endsWith('/learning/current'));
    await page.goto('/yunqi/current');
    const { data } = await (await responsePromise).json();
    expect(data.facts.input.localTime).toBe(dateTime);
    if (name === 'elapsed-stage') {
      expect(data.facts.currentStepProgress).toMatchObject({ elapsedRatio: 0.929, remainingCalendarDays: 4 });
      expect(data.currentMovementProgress.remainingCalendarDays).toBe(63);
    } else {
      expect(data.facts.currentStepProgress.remainingCalendarDays).toBe(0);
      if (name === 'qi-and-movement-end-today') expect(data.currentMovementProgress.remainingCalendarDays).toBe(0);
      else expect(data.currentMovementProgress.remainingCalendarDays).toBeGreaterThan(0);
    }
    await expectCurrentStageFacts(page, data);
    await expectCompactTimes(page);
    await screenshot(page, testInfo, name);
    const scan = await scanAccessibility(page);
    expect(scan.violations).toEqual([]);
  });
}

test('stage facts: the 2022 wood movement displays the neutral same-state label without splitting its phrases', async ({ page }) => {
  const dateTime = '2022-03-01T12:00:00+08:00';
  await useCalculatedCurrentSnapshot(page, dateTime);
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/learning/current'));
  await page.goto('/yunqi/current');
  const { data } = await (await responsePromise).json();
  expect(data.facts.input.localTime).toBe(dateTime);
  expect(data.ruleVersion).toBe('YQ-LEARNING-RULES-1.3.0');
  expect(data.currentMovement.relation).toEqual({
    elementRelation: 'SAME_ELEMENT', direction: 'NONE', traditionalLabel: '同属木运 · 太少相同',
  });

  expect(page.viewportSize().width).toBe(400);
  const grid = page.locator('.current-period-grid');
  const movement = grid.getByRole('region', { name: '当步运', exact: true });
  const chip = movement.locator('.ds-relation__chip');
  await expect(chip).toBeVisible();
  await expect(chip).toHaveText('同属木运 · 太少相同');
  await expect(chip).toHaveClass('ds-relation__chip ds-relation__chip--neutral');
  await expect(chip.locator('.ds-seg')).toHaveText(['同属木运', '太少相同']);
  await expect(grid).not.toContainText('不和');
  await expect(movement.locator('.ds-relation__explanation')).toHaveCount(0);

  await waitForAnimations(page);
  const segments = await grid.locator('.ds-seg').evaluateAll(elements => elements.map(element => {
    const text = document.createRange();
    text.selectNodeContents(element.querySelector('.ds-seg__text'));
    return { label: element.textContent, boxes: element.getClientRects().length, textLines: text.getClientRects().length };
  }));
  expect(segments.filter(({ boxes, textLines }) => boxes !== 1 || textLines !== 1)).toEqual([]);

  await page.getByText('计算说明与版本', { exact: true }).click();
  await expect(page.getByRole('region', { name: '规则结果说明' }).getByText(data.ruleVersion, { exact: true })).toBeVisible();
});
