import { test, expect, loadCurrent, settle, screenshot, expectPanelLayout } from './fixtures.mjs';

test('current-year shortcut and adjacent-year controls retain URL, bounds and history', async ({ page, diagnostics }) => {
  await page.goto('/yunqi/year');
  await expect(page.getByRole('button', { name: '上一年', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '下一年', exact: true })).toBeDisabled();
  await settle(page);
  expect(diagnostics.requests).toHaveLength(0);

  await loadCurrent(page);
  await page.getByRole('link', { name: '年度详情', exact: true }).click();
  await expect(page.locator('.drilldown-annual-summary')).toContainText('2024');
  await page.getByRole('combobox', { name: '分析年份' }).selectOption('');
  await expect(page.getByRole('button', { name: '上一年', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '下一年', exact: true })).toBeDisabled();
  await settle(page);
  expect(diagnostics.requests.filter(request => request.url.includes('/year/'))).toHaveLength(1);
  expect(diagnostics.requests).toHaveLength(2);

  await page.getByRole('combobox', { name: '分析年份' }).selectOption('2024');
  await expect(page.locator('.drilldown-annual-summary')).toContainText('2024');
  await page.getByRole('radio', { name: '第 3 步 三之气', exact: true }).check();
  await page.getByRole('button', { name: '下一年', exact: true }).click();
  await expect(page).toHaveURL(/\/yunqi\/year\/2025$/);
  await expect(page.locator('.drilldown-annual-summary')).toContainText('2025');
  await expect(page.getByRole('radio').first()).toBeChecked();
  await expect(page.getByRole('button', { name: '下一年', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '上一年', exact: true }).click();
  await expect(page.getByRole('combobox', { name: '分析年份' })).toHaveValue('2024');
  await page.goBack();
  await expect(page.getByRole('combobox', { name: '分析年份' })).toHaveValue('2025');

  await page.getByRole('combobox', { name: '分析年份' }).selectOption('1900');
  await expect(page.locator('.drilldown-annual-summary')).toContainText('1900');
  await expect(page.getByRole('button', { name: '上一年', exact: true })).toBeDisabled();
  await page.getByRole('combobox', { name: '分析年份' }).selectOption('2100');
  await expect(page.locator('.drilldown-annual-summary')).toContainText('2100');
  await expect(page.getByRole('button', { name: '下一年', exact: true })).toBeDisabled();
  await page.getByRole('combobox', { name: '分析年份' }).selectOption('');
  await expect(page).toHaveURL(/\/yunqi\/year$/);
  await expect(page.getByText('请选择要分析的年份', { exact: true })).toBeVisible();
  expect(diagnostics.requests.every(request => !/\/year\/(1899|2101)$/.test(request.url))).toBe(true);
});

test('panel stage selection keeps six single-column choices above nearby detail and preserves exact times', async ({ page, diagnostics }, testInfo) => {
  await page.setViewportSize({ width: 400, height: 860 });
  await page.goto('/yunqi/year/2024');
  const third = page.getByRole('radio', { name: '第 3 步 三之气', exact: true });
  await third.check();
  await expect(third).toHaveAccessibleDescription(/开始 2024-.*\+08:00，结束 2024-.*\+08:00，北京时间 UTC\+08/);
  const detail = page.getByRole('region', { name: '已选择：三之气', exact: true });
  await expect(detail).toBeVisible();
  const selector = await page.locator('.drilldown-stage-selector__options').boundingBox();
  const detailBox = await detail.boundingBox();
  const choices = await page.locator('.drilldown-stage-selector__option').all();
  expect(choices).toHaveLength(6);
  let previousBottom = selector.y;
  for (const choice of choices) {
    const bounds = await choice.boundingBox();
    expect(bounds.x).toBe(selector.x);
    expect(bounds.width).toBe(selector.width);
    expect(bounds.y).toBeGreaterThanOrEqual(previousBottom);
    previousBottom = bounds.y + bounds.height;
  }
  expect(detailBox.y - (selector.y + selector.height), 'Feedback follows the choices without a large gap').toBeLessThan(32);
  const contentExtent = await detail.evaluate(element => {
    const main = element.closest('main');
    return element.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop;
  });
  expect(contentExtent, 'Selected details do not require several full-screen scrolls').toBeLessThan(1500);
  await third.press('ArrowRight');
  await expect(page.getByRole('region', { name: '已选择：四之气', exact: true })).toBeVisible();
  await settle(page);
  expect(diagnostics.requests).toHaveLength(1);
  await expectPanelLayout(page);
  await screenshot(page, testInfo, 'panel-stage-comparison');
});

test('panel navigation, skip link and result traceability support keyboard recovery', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 400, height: 860 });
  await page.goto('/yunqi/year/2024');
  await page.getByRole('region', { name: '追溯信息', exact: true }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page.getByRole('region', { name: '全年 · 2024', exact: true })).toBeInViewport();
  await page.getByRole('link', { name: '先天对照', exact: true }).click();
  const birthContent = page.getByRole('main', { name: '先天对照', exact: true });
  await expect(birthContent).toBeFocused();
  const birthDate = birthContent.getByLabel('出生日期（公历）');
  await expect(birthDate).toBeVisible();
  await expect(birthDate).toBeEnabled();
  await expect(birthDate).toBeInViewport();
  await expect(birthContent.getByRole('button', { name: '查看出生与当前运气', exact: true })).toBeInViewport();
  await page.reload();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '跳至主要内容' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await page.getByRole('link', { name: '当下运气', exact: true }).click();
  const disclosure = page.locator('.current-technical');
  await disclosure.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(disclosure.getByText(/YunQi 当前查询 API · YQ-API-CONTRACT-1.2.0/)).toBeVisible();
  await page.keyboard.press('Space');
  await expect(disclosure.getByText(/YunQi 当前查询 API · YQ-API-CONTRACT-1.2.0/)).toBeHidden();
  await screenshot(page, testInfo, 'keyboard-technical-disclosure');
});
