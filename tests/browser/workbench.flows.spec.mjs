import { test, expect, loadCurrent, settle, screenshot } from './fixtures.mjs';

test('current route redirects, renders canonical time and closes every stage disclosure', async ({ page, diagnostics }, testInfo) => {
  await loadCurrent(page);
  await expect(page.locator('.current-yunqi-hero time')).toHaveText('2024-01-20 22:07:22');
  await expect(page.getByRole('link', { name: '当前五运六气', exact: true })).toHaveAttribute('aria-current', 'page');
  const toggles = page.locator('.timeline-item__toggle');
  await expect(toggles).toHaveCount(6);
  for (let index = 0; index < 6; index += 1) {
    const toggle = toggles.nth(index);
    const detailsId = await toggle.getAttribute('aria-controls');
    const details = page.locator(`[id="${detailsId}"]`);
    if (await toggle.getAttribute('aria-expanded') === 'true') await toggle.press('Enter');
    await expect(details).toBeHidden();
    await toggle.press('Space');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(details).toBeVisible();
    await toggle.press('Enter');
    await expect(details).toBeHidden();
  }
  const lastRailButton = page.getByRole('navigation', { name: '六气年度六阶段概览' }).getByRole('button').last();
  await lastRailButton.click();
  await expect(toggles.last()).toHaveAttribute('aria-expanded', 'true');
  await settle(page);
  expect(diagnostics.requests).toHaveLength(1);
  await screenshot(page, testInfo, 'current-disclosures');
});

test('annual entry, real year query, six-stage keyboard selection, history, reload and return form a loop', async ({ page, diagnostics }, testInfo) => {
  await loadCurrent(page);
  await page.getByRole('link', { name: '年度分析', exact: true }).click();
  await expect(page.getByText('请选择要分析的年份', { exact: true })).toBeVisible();
  await settle(page);
  expect(diagnostics.requests.filter(request => request.url.includes('/year/'))).toHaveLength(0);

  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/v1/yunqi/year/2024'));
  await page.getByRole('combobox', { name: '分析年份' }).selectOption('2024');
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  expect(data.year).toBe(2024);
  await expect(page.locator('.summary-grid').getByText(
    `${data.suiYun.element}运${data.suiYun.state}（${data.suiYun.tone}）`,
    { exact: true },
  )).toBeVisible();
  await expect(page).toHaveURL(/\/yunqi\/year\/2024$/);
  await expect(page.getByRole('link', { name: '年度分析', exact: true })).toHaveAttribute('aria-current', 'page');

  const radios = page.getByRole('radio');
  await expect(radios).toHaveCount(6);
  await expect(radios.first()).toBeChecked();
  await radios.first().press('ArrowRight');
  await expect(radios.nth(1)).toBeChecked();
  await expect(page.getByRole('heading', { name: `已选择：${data.sixQi.steps[1].name}`, exact: true })).toBeVisible();
  for (let index = 0; index < data.sixQi.steps.length; index += 1) {
    const step = data.sixQi.steps[index];
    await radios.nth(index).check();
    const detail = page.getByRole('region', { name: `已选择：${step.name}`, exact: true });
    await expect(detail).toBeVisible();
    await expect(detail.locator('time').first()).toHaveAttribute('datetime', step.start.localTime);
    await expect(detail.locator('time').last()).toHaveAttribute('datetime', step.end.localTime);
  }
  await radios.last().press('ArrowRight');
  await expect(radios.first()).toBeChecked();
  const annualRequests = () => diagnostics.requests.filter(request => request.url.includes('/year/'));
  expect(annualRequests()).toHaveLength(1);
  await screenshot(page, testInfo, 'annual-six-stage-selection');

  const nextResponsePromise = page.waitForResponse(response => response.url().endsWith('/api/v1/yunqi/year/2025'));
  await page.getByRole('combobox', { name: '分析年份' }).selectOption('2025');
  const nextResponse = await nextResponsePromise;
  expect(nextResponse.status()).toBe(200);
  const { data: nextYear } = await nextResponse.json();
  await expect(page.locator('.summary-grid')).toContainText('2025');
  await expect(radios.first()).toBeChecked();
  const guestGeneratesHostIndex = nextYear.sixQi.steps.findIndex(step => step.relation.direction === 'GUEST_GENERATES_HOST');
  expect(guestGeneratesHostIndex, 'The real 2025 response has a guest-generates-host stage').toBeGreaterThanOrEqual(0);
  const relatedStage = nextYear.sixQi.steps[guestGeneratesHostIndex];
  expect(relatedStage.relation.traditionalLabel).toBe('客生主，相得');
  expect(nextYear.ruleVersion).toBe('YQ-MVP-RULES-1.1.0');
  await radios.nth(guestGeneratesHostIndex).check();
  const relatedDetail = page.getByRole('region', { name: `已选择：${relatedStage.name}`, exact: true });
  await expect(relatedDetail.locator('dl').filter({
    has: page.getByText('方向关系', { exact: true }),
  }).locator('dd')).toHaveText('客生主');
  await expect(relatedDetail.locator('dl').filter({
    has: page.getByText('传统描述', { exact: true }),
  }).locator('dd')).toHaveText(relatedStage.relation.traditionalLabel);
  const trace = page.getByRole('region', { name: '追溯信息', exact: true });
  await expect(trace.getByText(nextYear.ruleVersion, { exact: true })).toBeVisible();
  await expect(trace.getByText('YQ-API-CONTRACT-1.1.0', { exact: true })).toBeVisible();
  await screenshot(page, testInfo, 'annual-upgraded-guest-generates-host');
  await page.goBack();
  await expect(page.getByRole('combobox', { name: '分析年份' })).toHaveValue('2024');
  await expect(page.locator('.summary-grid')).toContainText('2024');
  await page.goForward();
  await expect(page.getByRole('combobox', { name: '分析年份' })).toHaveValue('2025');
  await expect(page.locator('.summary-grid')).toContainText('2025');
  const beforeReload = annualRequests().length;
  await page.reload();
  await expect(page.locator('.summary-grid')).toContainText('2025');
  await settle(page);
  expect(annualRequests()).toHaveLength(beforeReload + 1);
  await page.getByRole('link', { name: '当前五运六气', exact: true }).click();
  await expect(page.locator('.current-yunqi-hero time')).toHaveAttribute('datetime', '2024-01-20T22:07:22+08:00');
});

for (const [year, message] of [
  ['abc', '年份格式错误，请选择四位年份'],
  ['2024extra', '年份格式错误，请选择四位年份'],
  ['1899', '年份范围应为 1900–2100'],
  ['2101', '年份范围应为 1900–2100'],
]) {
  test(`invalid year ${year} shows a recoverable message without a business query`, async ({ page, diagnostics }, testInfo) => {
    await page.goto(`/yunqi/year/${year}`);
    await expect(page.getByRole('alert')).toHaveText(message);
    await settle(page);
    expect(diagnostics.requests).toHaveLength(0);
    if (year === '1899' || year === '2101') await screenshot(page, testInfo, `annual-invalid-boundary-${year}`);
    await page.getByRole('combobox', { name: '分析年份' }).selectOption('2024');
    await expect(page.locator('.summary-grid')).toContainText('2024');
    expect(diagnostics.requests).toHaveLength(1);
  });
}

test('specified time is submit-only, rejects empty input and hides stale results after editing', async ({ page, diagnostics }, testInfo) => {
  await page.goto('/yunqi/calculate');
  await expect(page.getByRole('heading', { name: '指定时点分析', exact: true })).toBeVisible();
  await settle(page);
  expect(diagnostics.requests).toHaveLength(0);
  const input = page.getByLabel('分析时间', { exact: true });
  await page.getByRole('button', { name: '开始分析', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('请输入合法的北京时间');
  await expect(input).toBeFocused();
  await settle(page);
  expect(diagnostics.requests).toHaveLength(0);

  await input.fill('2024-01-20T22:07');
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/v1/yunqi/calculate'));
  await page.getByRole('button', { name: '开始分析', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  const result = page.getByRole('region', { name: '指定时点分析结果', exact: true });
  await expect(result).toBeVisible();
  await expect(result.locator('.time-analysis-result__time time')).toHaveAttribute('datetime', data.input.localTime);
  expect(JSON.parse(diagnostics.requests[0].body)).toEqual({ dateTime: '2024-01-20T22:07:00+08:00' });
  await screenshot(page, testInfo, 'calculated-real-api');

  await input.fill('2024-01-20T22:07:22');
  await expect(page.getByRole('status')).toHaveText('输入已修改，请重新分析');
  await expect(result).toHaveCount(0);
  await settle(page);
  expect(diagnostics.requests).toHaveLength(1);
  await input.press('Enter');
  await expect(result.locator('.time-analysis-result__time time')).toHaveAttribute('datetime', '2024-01-20T22:07:22+08:00');
  expect(diagnostics.requests).toHaveLength(2);
});

test('supported annual boundary years load directly from the real API', async ({ page, diagnostics }, testInfo) => {
  for (const year of [1900, 2100]) {
    const responsePromise = page.waitForResponse(response => response.url().endsWith(`/api/v1/yunqi/year/${year}`));
    await page.goto(`/yunqi/year/${year}`);
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const { data } = await response.json();
    expect(data.year).toBe(year);
    expect(data.ruleVersion).toBe('YQ-MVP-RULES-1.1.0');
    await expect(page.getByRole('combobox', { name: '分析年份' })).toHaveValue(String(year));
    await expect(page.locator('.summary-grid')).toContainText(String(year));
    await expect(page.getByRole('radio')).toHaveCount(6);
    const trace = page.getByRole('region', { name: '追溯信息', exact: true });
    await expect(trace.getByText(data.ruleVersion, { exact: true })).toBeVisible();
    await expect(trace.getByText('YQ-API-CONTRACT-1.1.0', { exact: true })).toBeVisible();
    await screenshot(page, testInfo, `annual-boundary-${year}`);
  }
  expect(diagnostics.requests).toHaveLength(2);
});

test('a real unsupported calculation receives sanitized feedback and recovers after editing', async ({ page, diagnostics }) => {
  diagnostics.allowHttpFailure('/api/v1/yunqi/calculate', 400);
  await page.goto('/yunqi/calculate');
  await page.getByLabel('分析时间', { exact: true }).fill('1800-06-19T12:00');
  const rejected = page.waitForResponse(response => response.url().endsWith('/api/v1/yunqi/calculate'));
  await page.getByRole('button', { name: '开始分析', exact: true }).click();
  expect((await rejected).status()).toBe(400);
  await expect(page.getByRole('alert')).toContainText('指定时点分析失败，请重试');
  await expect(page.getByRole('region', { name: '指定时点分析结果', exact: true })).toHaveCount(0);
  await page.getByLabel('分析时间', { exact: true }).fill('2024-01-20T22:07:22');
  await page.getByRole('button', { name: '开始分析', exact: true }).click();
  await expect(page.getByRole('region', { name: '指定时点分析结果', exact: true })).toBeVisible();
  expect(diagnostics.requests).toHaveLength(2);
});

test('pending calculation disables input and repeated activation sends only one real request', async ({ page, diagnostics }) => {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  try {
    await page.goto('/yunqi/calculate');
    const input = page.getByLabel('分析时间', { exact: true });
    await expect(input).toBeEditable();
    // This fault targets the submitted POST, after the real page has loaded.
    await page.route('**/api/v1/yunqi/calculate', async route => {
      await held;
      await route.continue();
    });
    await input.fill('2024-01-20T22:07:22');
    await page.getByRole('button', { name: '开始分析', exact: true }).click({ clickCount: 2 });
    await expect(page.getByRole('status')).toHaveText('正在分析指定时点');
    await expect(input).toBeDisabled();
    await expect(page.getByRole('button', { name: '正在分析', exact: true })).toBeDisabled();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    expect(diagnostics.requests).toHaveLength(1);
    release();
    await expect(page.getByRole('region', { name: '指定时点分析结果', exact: true })).toBeVisible();
    await expect(input).toBeEnabled();
    await settle(page);
    expect(diagnostics.requests).toHaveLength(1);
  } finally {
    release();
  }
});

test('calculation outage is sanitized and retry recovers using the real API', async ({ page, diagnostics }, testInfo) => {
  diagnostics.allowHttpFailure('/api/v1/yunqi/calculate', 503);
  let failed = false;
  await page.route('**/api/v1/yunqi/calculate', route => {
    if (!failed) {
      failed = true;
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'TEST_ONLY_INTERNAL_STACK' }) });
    }
    return route.continue();
  });
  await page.goto('/yunqi/calculate');
  await page.getByLabel('分析时间', { exact: true }).fill('2024-01-20T22:07:22');
  await page.getByRole('button', { name: '开始分析', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('指定时点分析失败，请重试');
  await expect(page.getByText('TEST_ONLY_INTERNAL_STACK')).toHaveCount(0);
  await expect(page.getByRole('region', { name: '指定时点分析结果', exact: true })).toHaveCount(0);
  await screenshot(page, testInfo, 'calculation-error');
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.getByRole('region', { name: '指定时点分析结果', exact: true })).toBeVisible();
  expect(diagnostics.requests).toHaveLength(2);
});

for (const [path, endpoint, error] of [
  ['/yunqi/current', '/api/v1/yunqi/current', '加载失败'],
  ['/yunqi/year/2024', '/api/v1/yunqi/year/2024', '年度数据加载失败'],
]) {
  test(`${path} recovers after a single failed GET`, async ({ page, diagnostics }) => {
    diagnostics.allowHttpFailure(endpoint, 503);
    let failed = false;
    await page.route(`**${endpoint}`, route => {
      if (!failed) {
        failed = true;
        return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
      }
      return route.continue();
    });
    await page.goto(path);
    await expect(page.getByRole('alert')).toContainText(error);
    await page.getByRole('button', { name: '重试', exact: true }).click();
    await expect(page.getByRole('heading', { name: '年度概览', exact: true })).toBeVisible();
    expect(diagnostics.requests).toHaveLength(2);
  });
}

test('inquiry remains a no-query planning entry and invalid child routes return to current', async ({ page, diagnostics }) => {
  await page.goto('/yunqi/inquiry');
  await expect(page.getByRole('heading', { name: '问诊结构化入口', exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(3);
  await expect(page.getByRole('article').getByText('规划中', { exact: true })).toHaveCount(3);
  await expect(page.getByRole('navigation', { name: '工作台导航' }).getByRole('link', { name: /问诊.*规划中/ })).toBeVisible();
  await expect(page.getByRole('main').locator('button, input, select, textarea, a, [tabindex]')).toHaveCount(0);
  await settle(page);
  expect(diagnostics.requests).toHaveLength(0);
  for (const child of ['patient', 'history', 'new']) {
    await page.goto(`/yunqi/inquiry/${child}`);
    await expect(page.getByRole('heading', { name: '页面未找到', exact: true })).toBeVisible();
    await settle(page);
    expect(diagnostics.requests).toHaveLength(0);
  }
  await page.getByRole('link', { name: '返回当前五运六气', exact: true }).click();
  await expect(page.getByRole('heading', { name: '年度概览', exact: true })).toBeVisible();
  expect(diagnostics.requests.map(request => new URL(request.url).pathname)).toEqual(['/api/v1/yunqi/current']);
});
