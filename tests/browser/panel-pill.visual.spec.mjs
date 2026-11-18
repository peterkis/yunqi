import { test, expect, loadCurrent, settle, screenshot, scanAccessibility } from './fixtures.mjs';
import { expectPillGeometry } from './consistency-helpers.mjs';

for (const theme of ['light', 'dark']) {
  test(`@visual collapsed pill ${theme}: 424x88 host, 400x64 pill, typography, keyboard and accessibility`, async ({ page, diagnostics }, testInfo) => {
    const data = await loadCurrent(page);
    if (theme === 'dark') await page.getByRole('button', { name: '切换至深色主题' }).click();
    await settle(page);
    const requestsBefore = diagnostics.requests.length;
    await page.getByRole('button', { name: '收起为胶囊条' }).press('Enter');
    const pill = page.getByRole('button', { name: /^展开运气通/ });
    await expect(pill).toBeFocused();
    await expect(pill).toHaveCSS('outline-width', '2px');
    await expect(pill).toHaveCSS('outline-offset', '2px');
    await expect(pill).toHaveCSS('outline-style', 'solid');
    await expect(pill).not.toHaveCSS('outline-color', 'rgba(0, 0, 0, 0)');
    await expect(pill).toHaveCSS('box-shadow', /inset/);
    await expect(pill).toContainText(data.facts.stemBranch.ganzhi);
    await expect(pill).toContainText(`${data.facts.suiYun.element}运${data.facts.suiYun.state}`);
    await expect(page.getByRole('main')).toHaveCount(0);
    await expect(page.getByRole('button')).toHaveCount(1);
    const layout = await expectPillGeometry(page, pill);
    expect(layout).toMatchObject({ x: 12, y: 10, width: 400, height: 64, right: 12, bottom: 14, documentWidth: 424, documentHeight: 88, fits: true });
    await expect(pill.locator('.panel-pill__ganzhi')).toHaveText(data.facts.stemBranch.ganzhi);
    await testInfo.attach('pill-geometry', { body: JSON.stringify(layout, null, 2), contentType: 'application/json' });
    await screenshot(page, testInfo, `collapsed-pill-${theme}`);
    const scan = await scanAccessibility(page);
    await testInfo.attach('axe-results', { body: JSON.stringify(scan, null, 2), contentType: 'application/json' });
    expect(scan.violations).toEqual([]);
    await pill.press('Space');
    await expect(page.getByRole('button', { name: '收起为胶囊条' })).toBeFocused();
    expect(diagnostics.requests).toHaveLength(requestsBefore);
  });
}
