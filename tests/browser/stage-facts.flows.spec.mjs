import { test, expect, screenshot, expectCompactTimes, scanAccessibility } from './fixtures.mjs';
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
