import { expect } from './fixtures.mjs';
import { expectElementTitle } from './visual-assertions.mjs';

export async function fillAnalysisTime(page, localTime) {
  const [date, time] = localTime.split('T');
  await page.getByLabel('选择日期', { exact: true }).fill(date);
  await page.getByLabel('选择时刻', { exact: true }).fill(time);
}

export async function expectSelectedTimeLayout(result, data) {
  const rows = result.locator('.drilldown-stage-overview > li');
  await expect(rows).toHaveCount(6);
  const elements = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' };
  for (const [i, step] of data.sixQi.steps.entries()) {
    const heading = rows.nth(i).locator('.drilldown-stage-overview__heading');
    await expect(heading.locator('strong')).toHaveText(step.name);
    await expectElementTitle(heading, elements[step.guestQi.slice(-1)], '.ds-info-card');
    const index = heading.getByText(`第 ${step.index} 步`, { exact: true });
    const [row, label] = await Promise.all([heading.boundingBox(), index.boundingBox()]);
    expect(Math.abs(row.x + row.width - label.x - label.width)).toBeLessThanOrEqual(1);
    const [title, range] = await Promise.all([heading.locator('strong').boundingBox(), heading.locator('.yunqi-time-range').boundingBox()]);
    expect(range.x - title.x - title.width).toBeGreaterThanOrEqual(4);
    expect(Math.abs(title.y + title.height / 2 - range.y - range.height / 2)).toBeLessThanOrEqual(1);
    expect(range.x + range.width).toBeLessThanOrEqual(label.x);
    const columns = rows.nth(i).locator('.drilldown-stage-overview__qi > span');
    await expect(columns).toHaveText([`主气 ${step.hostQi}`, `客气 ${step.guestQi}`]);
    const [host, guest] = await Promise.all([columns.first().boundingBox(), columns.last().boundingBox()]);
    expect(Math.abs(host.y + host.height / 2 - guest.y - guest.height / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(host.width - guest.width)).toBeLessThanOrEqual(1);
    expect(host.x + host.width).toBeLessThan(guest.x);
  }
  await expect(result.locator('.drilldown-selection-label')).toHaveCount(1);
  await expect(rows.nth(data.currentStep.index - 1)).toContainText('所选时点');
  await expect(result.getByText('计算说明与版本', { exact: true })).toHaveCount(0);
  const ranges = result.locator('.yunqi-time-range');
  await expect(ranges).toHaveCount(8);
  const misplaced = await ranges.evaluateAll(nodes => nodes.flatMap(range => {
    const [start, end] = [...range.querySelectorAll('time')].map(t => t.getBoundingClientRect());
    const arrow = range.querySelector('[aria-hidden]').getBoundingClientRect();
    const card = range.closest('.ds-info-card').getBoundingClientRect();
    return Math.abs(start.y - end.y) > 1 || arrow.x < start.right - 1 || end.x < arrow.right - 1
      || start.x < card.x || end.right > card.right ? [range.textContent] : [];
  }));
  expect(misplaced).toEqual([]);
}
