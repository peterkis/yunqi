import AxeBuilder from '@axe-core/playwright';
import { test, expect, loadCurrent, settle, screenshot } from './fixtures.mjs';

for (const theme of ['light', 'dark']) {
  test(`@visual collapsed pill ${theme}: 400x64, typography, keyboard and accessibility`, async ({ page, diagnostics }, testInfo) => {
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
    const layout = await pill.evaluate(element => ({
      x: element.getBoundingClientRect().x, y: element.getBoundingClientRect().y,
      width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height,
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      fits: element.scrollWidth <= element.clientWidth,
    }));
    expect(layout).toEqual({ x: 0, y: 0, width: 400, height: 64, documentWidth: 400, documentHeight: 64, fits: true });
    await screenshot(page, testInfo, `collapsed-pill-${theme}`);
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    await testInfo.attach('axe-results', { body: JSON.stringify(scan, null, 2), contentType: 'application/json' });
    expect(scan.violations).toEqual([]);
    await pill.press('Space');
    await expect(page.getByRole('button', { name: '收起为胶囊条' })).toBeFocused();
    expect(diagnostics.requests).toHaveLength(requestsBefore);
  });
}
