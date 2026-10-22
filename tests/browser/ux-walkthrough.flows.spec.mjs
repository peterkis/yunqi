import { test, expect, loadCurrent, settle, screenshot } from './fixtures.mjs';

test('current-year shortcut and adjacent-year controls retain URL, bounds and history', async ({ page, diagnostics }) => {
  await page.goto('/yunqi/year');
  await expect(page.getByRole('button', { name: '上一年', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '下一年', exact: true })).toBeDisabled();
  await settle(page);
  expect(diagnostics.requests).toHaveLength(0);

  await loadCurrent(page);
  await page.getByRole('link', { name: '查看 2024 年六气' }).click();
  await expect(page.locator('.summary-grid')).toContainText('2024');
  await page.getByRole('radio', { name: '第 3 步 三之气', exact: true }).check();
  await page.getByRole('button', { name: '下一年', exact: true }).click();
  await expect(page).toHaveURL(/\/yunqi\/year\/2025$/);
  await expect(page.locator('.summary-grid')).toContainText('2025');
  await expect(page.getByRole('radio').first()).toBeChecked();
  await expect(page.getByRole('button', { name: '下一年', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '上一年', exact: true }).click();
  await expect(page.getByRole('combobox', { name: '分析年份' })).toHaveValue('2024');
  await page.goBack();
  await expect(page.getByRole('combobox', { name: '分析年份' })).toHaveValue('2025');

  await page.getByRole('combobox', { name: '分析年份' }).selectOption('1900');
  await expect(page.locator('.summary-grid')).toContainText('1900');
  await expect(page.getByRole('button', { name: '上一年', exact: true })).toBeDisabled();
  await page.getByRole('combobox', { name: '分析年份' }).selectOption('2100');
  await expect(page.locator('.summary-grid')).toContainText('2100');
  await expect(page.getByRole('button', { name: '下一年', exact: true })).toBeDisabled();
  await page.getByRole('combobox', { name: '分析年份' }).selectOption('');
  await expect(page).toHaveURL(/\/yunqi\/year$/);
  await expect(page.getByText('请选择要分析的年份', { exact: true })).toBeVisible();
  expect(diagnostics.requests.every(request => !/\/year\/(1899|2101)$/.test(request.url))).toBe(true);
});

test('mobile stage selection keeps all six choices beside nearby detail and preserves exact time descriptions', async ({ page, diagnostics }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/yunqi/year/2024');
  const third = page.getByRole('radio', { name: '第 3 步 三之气', exact: true });
  await third.check();
  await expect(third).toHaveAccessibleDescription(/开始 2024-.*\+08:00，结束 2024-.*\+08:00，北京时间 UTC\+08/);
  const detail = page.getByRole('region', { name: '已选择：三之气', exact: true });
  await expect(detail).toBeVisible();
  const selector = await page.locator('.annual-six-qi-selector__options').boundingBox();
  const detailBox = await detail.boundingBox();
  expect(selector.height, 'All six choices fit within a compact area').toBeLessThan(300);
  expect(detailBox.y - (selector.y + selector.height), 'Feedback follows the choices without a large gap').toBeLessThan(32);
  const detailDocumentY = await detail.evaluate(element => element.getBoundingClientRect().top + window.scrollY);
  expect(detailDocumentY, 'Selected details do not require several full-screen scrolls').toBeLessThan(1500);
  await third.press('ArrowRight');
  await expect(page.getByRole('region', { name: '已选择：四之气', exact: true })).toBeVisible();
  await settle(page);
  expect(diagnostics.requests).toHaveLength(1);
  await screenshot(page, testInfo, 'mobile-stage-comparison');
});

test('sticky navigation, skip link and technical disclosure support keyboard recovery', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/yunqi/year/2024');
  await page.getByRole('region', { name: '追溯信息', exact: true }).scrollIntoViewIfNeeded();
  await page.getByRole('link', { name: '指定时点', exact: true }).click();
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page.getByRole('heading', { name: '指定时点分析', exact: true })).toBeInViewport();
  await page.reload();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '跳至主要内容' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  const disclosure = page.locator('.contract-disclosure');
  await disclosure.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(disclosure.getByText('YQ-API-CONTRACT-1.1.0', { exact: true })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(disclosure.getByText('YQ-API-CONTRACT-1.1.0', { exact: true })).toBeHidden();
  await screenshot(page, testInfo, 'keyboard-technical-disclosure');
});
