import { test, expect, scanAccessibility, waitForAnimations } from './fixtures.mjs';

test('inline landscape seal follows the selected date and surfaces both annual boundary candidates', async ({ page }, testInfo) => {
  await page.goto('/yunqi/birth');
  const form = page.getByRole('form', { name: '出生运气输入' });
  const seal = form.getByRole('group', { name: '出生运气预览' });
  await form.getByRole('radio', { name: '按出生年份' }).click();
  await form.getByRole('textbox', { name: '年', exact: true }).fill('1980');
  await expect(seal).toContainText('待定');
  const month = form.getByRole('textbox', { name: '月', exact: true });
  const day = form.getByRole('textbox', { name: '日', exact: true });
  await month.fill('03');
  await day.fill('12');
  await expect(seal).toHaveText('庚申1980 · 金运太过之年');
  await page.screenshot({ path: testInfo.outputPath('resolved-seal.png') });
  const { data } = await (await page.request.get('/api/v1/yunqi/year/1980')).json();
  const boundary = data.interval.start.localTime.slice(0, 10);
  await month.fill(boundary.slice(5, 7));
  await day.fill(boundary.slice(8, 10));
  await expect(seal).toContainText('年界');
  await expect(seal).toContainText('己未年 ／ 庚申年');
  await expect(form.getByRole('button', { name: /补录时刻/ })).toBeVisible();
  await form.getByRole('radio', { name: '农历', exact: true }).click();
  await month.fill('11'); await day.fill('14');
  await expect(seal).toContainText('待核对');
  await form.getByRole('radio', { name: /1980-01-01/ }).check();
  await expect(seal).toContainText('己未');
});

for (const [width, height, dark] of [[400, 640, false], [400, 860, true], [1366, 900, false]]) {
  test(`inline birth entry annual and lunar workflows ${width}x${height} ${dark ? 'dark' : 'light'}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto('/yunqi/birth');
    const form = page.getByRole('form', { name: '出生运气输入' });
    await expect(form.getByRole('textbox', { name: '年龄' })).toBeFocused();
    await expect(form.getByText('资料仅在本次会话内使用，清空后销毁。')).toHaveCount(0);
    const placeholderOpacity = input => input.evaluate(node => getComputedStyle(node, '::placeholder').opacity);
    expect(await placeholderOpacity(form.getByRole('textbox', { name: '年龄' }))).toBe('0');
    expect(await placeholderOpacity(form.getByRole('textbox', { name: '月', exact: true }))).toBe('1');
    const seal = form.getByRole('group', { name: '出生运气预览' });
    await expect(seal).toContainText('待录出生信息');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    if (dark) {
      await page.getByRole('button', { name: '切换至深色主题' }).click();
    }
    const clock = await (await page.request.get('/api/v1/yunqi/current')).json();
    const year = Number(clock.data.input.localTime.slice(0,4));
    await form.getByRole('textbox', { name: '年龄' }).pressSequentially(String(year - 1980));
    await expect(form).toContainText('推算 1980 年');
    await expect(seal).toContainText('待定');
    await expect(form).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(form.locator('.birth-slot').first()).toHaveCSS('box-shadow', 'none');
    await expect(form.getByRole('radiogroup', { name: '出生年份录入方式' })).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(form.getByRole('button', { name: '仅按年份对照' })).toBeInViewport({ ratio: 1 });
    expect((await scanAccessibility(page)).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('age-sheet.png') });
    await page.keyboard.press('Enter');
    const main = page.getByRole('region', { name: '出生与当前运气对照结果' });
    await expect(main.getByRole('table')).toHaveCount(2);
    await expect(main.getByRole('rowheader')).toHaveCount(6);
    const summary = page.getByRole('group', { name: '出生资料摘要' });
    await expect(summary).toHaveCSS('align-items', 'baseline');
    for (const name of ['修改', '清空本次资料']) {
      const action = summary.getByRole('button', { name, exact: true });
      await action.hover();
      await expect(action).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    }
    for (const interval of await main.locator('.birth-candidate-interval').all()) {
      const [label, range, start, end] = await interval.evaluate(node =>
        [node.firstElementChild, node.lastElementChild, ...node.lastElementChild.children].map(el => {
          const box = el.getBoundingClientRect();
          return { top: box.top, bottom: box.bottom };
        }));
      expect(range.top).toBeGreaterThanOrEqual(label.bottom);
      expect(start.top).toBe(end.top);
    }
    await expect(page.getByRole('button', { name: /补全生日后查看/ })).toHaveCSS('border-top-width', '0px');
    await page.getByRole('link', { name: '全部原文' }).click();
    await expect(page.getByRole('button', { name: '全年', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: '出生阶段', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: '返回', exact: true }).click();
    await page.getByRole('button', { name: '同时测评体质' }).click();
    await expect(page.getByRole('form', { name: '中医体质量表' })).toBeVisible();
    await page.getByRole('link', { name: '先天对照' }).click();
    await page.getByRole('button', { name: /补全生日后查看/ }).click();
    const sheet = page.getByRole('dialog', { name: '修改出生信息' });
    await expect(sheet).toBeVisible();
    await expect(form.getByRole('textbox', { name: '月', exact: true })).toBeFocused();
    await expect(sheet.getByRole('group', { name: '出生运气预览' })).toHaveCount(0);
    await expect(sheet.getByRole('button', { name: '退格' }).locator('.lucide-x')).toHaveCount(1);
    await form.getByRole('textbox', { name: '月', exact: true }).fill('12');
    await expect(form).toContainText('已按出生月自动修正为 1979 年');
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole('button', { name: /补全生日后查看/ })).toBeFocused();
    await expect(page.getByRole('group', { name: '出生资料摘要' })).toContainText('1980 年');
    await page.getByRole('button', { name: '修改', exact: true }).click();
    await expect(form.getByRole('textbox', { name: '年', exact: true })).toHaveValue('1980');
    await expect(form.getByRole('textbox', { name: '月', exact: true })).toHaveValue('');
    await expect(form.getByRole('textbox', { name: '日', exact: true })).toHaveValue('');
    const month = form.getByRole('textbox', { name: '月', exact: true });
    const fieldY = () => form.locator('.birth-slot__value').evaluateAll(items => items.map(item => item.getBoundingClientRect().bottom));
    await waitForAnimations(page);
    const before = await fieldY();
    await month.fill('13');
    await expect(month).toHaveValue('');
    expect(await fieldY()).toEqual(before);
    await expect(form.locator('[data-tone="error"]')).toContainText('出生月须为');
    await expect(month).toHaveCSS('font-family', /monospace/);
    await expect(form.getByRole('button', { name: '退格' }).locator('svg')).toHaveCount(1);
    await form.getByRole('radio', { name: '农历', exact: true }).click();
    await form.getByRole('textbox', { name: '月', exact: true }).fill('10');
    await form.getByRole('textbox', { name: '日', exact: true }).fill('03');
    await expect(form).toContainText('十月初三 · 1980-11-10');
    await page.screenshot({ path: testInfo.outputPath('lunar-sheet.png') });
    await form.getByRole('button', { name: '确认并对照' }).click();
    await expect(main.getByRole('rowheader')).toHaveCount(5);
    const originalTable = await main.getByRole('table').innerText();
    await page.getByRole('button', { name: '修改', exact: true }).click();
    await expect(form.getByRole('radio', { name: '农历', exact: true })).toBeChecked();
    const editYear = form.getByRole('textbox', { name: '年', exact: true });
    await expect(editYear).toBeFocused();
    expect(await editYear.evaluate(el => [el.selectionStart, el.selectionEnd])).toEqual([0, 4]);
    await expect(form.getByRole('textbox', { name: '月', exact: true })).toHaveValue('10');
    await expect(form.getByRole('textbox', { name: '日', exact: true })).toHaveValue('03');
    await page.keyboard.type('1981');
    await expect(editYear).toHaveValue('1981');
    await expect(form.getByRole('textbox', { name: '月', exact: true })).toBeFocused();
    // Click the exposed scrim inside the panel with a real pointer.
    await sheet.click({ position: { x: 8, y: 8 } });
    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole('button', { name: '修改', exact: true })).toBeFocused();
    await expect(page.getByRole('group', { name: '出生资料摘要' })).toContainText('1980-11-10');
    expect(await main.getByRole('table').innerText()).toBe(originalTable);
    await page.getByRole('button', { name: '修改', exact: true }).click();
    await expect(form.getByRole('textbox', { name: '年', exact: true })).toHaveValue('1980');
    await expect(form.getByRole('radio', { name: '农历', exact: true })).toBeChecked();
    await form.getByRole('textbox', { name: '月', exact: true }).fill('11');
    await form.getByRole('textbox', { name: '日', exact: true }).fill('14');
    await expect(form.getByRole('radio', { name: /1980-01-01/ })).toBeVisible();
    await form.getByRole('radio', { name: /1980-12-20/ }).check();
    await form.getByRole('button', { name: '确认并对照' }).click();
    await expect(page.getByRole('group', { name: '出生资料摘要' })).toContainText('1980-12-20');
  });
}
