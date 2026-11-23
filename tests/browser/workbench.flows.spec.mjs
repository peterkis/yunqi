import { confirmConstitutionDestruction } from './constitution-helpers.mjs';
import { test, expect, loadCurrent, settle, screenshot, expectPanelLayout, expectCompactTimes, expectNoPersonalDataInUrl } from './fixtures.mjs';
import { expectMoreRows } from './consistency-helpers.mjs';
import { expectCurrentStageFacts } from './stage-facts-helpers.mjs';
import { expectElementTitle } from './visual-assertions.mjs';

test('current route redirects, renders canonical time and closes every stage disclosure', async ({ page, diagnostics }, testInfo) => {
  const data = await loadCurrent(page);
  await expectCurrentStageFacts(page, data);
  await expect(page.getByRole('link', { name: '当下运气', exact: true })).toHaveAttribute('aria-current', 'page');
  await expectMoreRows(page);
  await expect(page.locator('.current-all-stages')).not.toHaveAttribute('open');
  await expect(page.locator('.current-stage-row button').first()).toBeHidden();
  await page.locator('.current-all-stages > summary').click();
  await expectMoreRows(page);
  const toggles = page.locator('.current-stage-row button');
  await expect(toggles).toHaveCount(6);
  const elementByName = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' };
  for (let index = 0; index < 6; index += 1) {
    const step = data.facts.sixQi.steps[index];
    const heading = page.locator('.current-stage-row').nth(index).getByRole('heading', { name: step.name, exact: true });
    await expectElementTitle(heading, elementByName[step.guestQi.slice(-1)], '.ds-info-card');
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
  // The compact stage navigation and details both remain keyboard reachable.
  await expect(page.getByRole('navigation', { name: '六气年度六阶段概览' })).toBeVisible();
  await toggles.last().click();
  await expect(toggles.last()).toHaveAttribute('aria-expanded', 'true');
  await settle(page);
  await expectCompactTimes(page);
  await page.locator('.current-technical > summary').click();
  await expectMoreRows(page);
  const precision = page.locator('.current-technical');
  for (const value of [data.facts.input, data.facts.interval.start, data.facts.interval.end,
    ...data.facts.sixQi.steps.flatMap(step => [step.start, step.end]),
    ...data.movements.flatMap(step => [step.start, step.end])]) {
    await expect(precision.locator(`time[datetime="${value.localTime}"]`).first()).toHaveText(value.localTime.replace('T', ' ').replace(/\+08:00$/, ''));
  }
  expect(diagnostics.requests).toHaveLength(1);
  await screenshot(page, testInfo, 'current-disclosures');
});

test('annual entry, real year query, six-stage keyboard selection, history, reload and return form a loop', async ({ page, diagnostics }, testInfo) => {
  await page.setViewportSize({ width: 400, height: 860 });
  await loadCurrent(page);
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/v1/yunqi/year/2024'));
  await page.getByRole('link', { name: '年度详情', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  await expect(page.locator('.drilldown-annual-summary')).toContainText('2024');
  const defaultResponse = page.waitForResponse(response => response.url().endsWith('/learning/current'));
  await page.getByRole('combobox', { name: '分析年份' }).selectOption('');
  const { data: current } = await (await defaultResponse).json();
  await expect(page.getByRole('combobox', { name: '分析年份' })).toHaveValue(String(current.facts.year));
  await settle(page);
  // The current API supplies the default; the previously loaded year is cached.
  expect(diagnostics.requests.filter(request => request.url.includes('/year/'))).toHaveLength(1);
  await page.getByRole('combobox', { name: '分析年份' }).selectOption('2024');
  expect(data.year).toBe(2024);
  await expect(page.locator('.drilldown-annual-summary').getByText(
    `${data.suiYun.element}运${data.suiYun.state}（${data.suiYun.tone}）`,
    { exact: true },
  )).toBeVisible();
  await expect(page).toHaveURL(/\/yunqi\/year\/2024(?:\?motion=off)?$/);
  await expect(page.getByRole('navigation', { name: '工作台导航' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '页面导航' }).getByRole('heading', { name: '年度详情', exact: true })).toBeVisible();

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
  await expectPanelLayout(page);
  await screenshot(page, testInfo, 'annual-six-stage-selection');

  const nextResponsePromise = page.waitForResponse(response => response.url().endsWith('/api/v1/yunqi/year/2025'));
  await page.getByRole('combobox', { name: '分析年份' }).selectOption('2025');
  const nextResponse = await nextResponsePromise;
  expect(nextResponse.status()).toBe(200);
  const { data: nextYear } = await nextResponse.json();
  await expect(page.locator('.drilldown-annual-summary')).toContainText('2025');
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
  await page.locator('.drilldown-technical > summary').click();
  await expect(trace.getByText(nextYear.ruleVersion, { exact: true })).toBeVisible();
  await expect(trace.getByText('YQ-API-CONTRACT-1.4.0', { exact: true })).toBeVisible();
  await screenshot(page, testInfo, 'annual-upgraded-guest-generates-host');
  await expect(page).toHaveURL(/\/yunqi\/year\/2025(?:\?motion=off)?$/);
  await expect(page.getByRole('heading', { name: '年度详情', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/yunqi\/year\/2024(?:\?motion=off)?$/);
  await expect(page.getByRole('heading', { name: '年度详情', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: '分析年份' })).toHaveValue('2024');
  await expect(page.locator('.drilldown-annual-summary')).toContainText('2024');
  await page.goForward();
  await expect(page).toHaveURL(/\/yunqi\/year\/2025(?:\?motion=off)?$/);
  await expect(page.getByRole('heading', { name: '年度详情', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: '分析年份' })).toHaveValue('2025');
  await expect(page.locator('.drilldown-annual-summary')).toContainText('2025');
  const beforeReload = annualRequests().length;
  await page.reload();
  await expect(page).toHaveURL(/\/yunqi\/year\/2025(?:\?motion=off)?$/);
  await expect(page.getByRole('heading', { name: '年度详情', exact: true })).toBeVisible();
  await expect(page.locator('.drilldown-annual-summary')).toContainText('2025');
  await settle(page);
  expect(annualRequests()).toHaveLength(beforeReload + 1);
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await expect(page.locator('.current-technical time').first()).toHaveAttribute('datetime', '2024-01-20T22:07:22+08:00');
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
    await expect(page.locator('.drilldown-annual-summary')).toContainText('2024');
    expect(diagnostics.requests).toHaveLength(1);
  });
}

test('a pending URL year hides prior facts and keeps loading inside the panel', async ({ page, diagnostics }, testInfo) => {
  await page.setViewportSize({ width: 400, height: 860 });
  await page.goto('/yunqi/year/2024');
  await expect(page.getByRole('region', { name: '年度概览', exact: true })).toBeVisible();
  let release;
  const held = new Promise(resolve => { release = resolve; });
  try {
    // Delay only the next query, after the first real annual result is ready.
    await page.route('**/api/v1/yunqi/year/2025', async route => {
      await held;
      await route.continue();
    });
    const next = page.getByRole('button', { name: '下一年', exact: true });
    await next.click();
    await expect(page).toHaveURL(/\/yunqi\/year\/2025(?:\?motion=off)?$/);
    await expect(page.getByRole('combobox', { name: '分析年份' })).toHaveValue('2025');
    await expect(next).toBeFocused();
    await expect(page.getByRole('status')).toHaveText('正在加载 2025 年年度五运六气数据');
    await expect(page.getByRole('region', { name: '年度概览', exact: true })).toHaveCount(0);
    await expectPanelLayout(page);
    await screenshot(page, testInfo, 'annual-loading');
    release();
    await expect(page.locator('.drilldown-annual-summary')).toContainText('2025');
    await expect(page.getByRole('radio').first()).toBeChecked();
    await settle(page);
    expect(diagnostics.requests).toHaveLength(2);
  } finally {
    release();
  }
});

test('specified time is submit-only, rejects empty input and hides stale results after editing', async ({ page, diagnostics }, testInfo) => {
  await page.setViewportSize({ width: 400, height: 860 });
  await loadCurrent(page);
  await page.getByRole('link', { name: '指定时点', exact: true }).click();
  await expect(page.getByRole('main')).toBeFocused();
  const calculationRequests = () => diagnostics.requests.filter(request => request.url.endsWith('/api/v1/yunqi/calculate'));
  await expect(page.getByRole('heading', { name: '指定时点分析', exact: true })).toBeVisible();
  await expectPanelLayout(page);
  await settle(page);
  expect(calculationRequests()).toHaveLength(0);
  expect(diagnostics.requests).toHaveLength(1);
  const input = page.getByLabel('分析时间', { exact: true });
  await page.getByRole('button', { name: '开始分析', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('请输入有效的日期和时刻');
  await expect(input).toBeFocused();
  await settle(page);
  expect(calculationRequests()).toHaveLength(0);
  expect(diagnostics.requests).toHaveLength(1);

  await input.fill('2024-01-20T22:07');
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/v1/yunqi/calculate'));
  await page.getByRole('button', { name: '开始分析', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  const result = page.getByRole('region', { name: '指定时点分析结果', exact: true });
  await expect(result).toBeVisible();
  await expect(result.locator('.drilldown-time-result__time time')).toHaveAttribute('datetime', data.input.localTime);
  const selected = result.getByRole('region', { name: `所选时点所在阶段：${data.currentStep.name}`, exact: true });
  await expect(selected.locator('time').first()).toHaveAttribute('datetime', data.currentStep.start.localTime);
  await expect(selected.locator('time').last()).toHaveAttribute('datetime', data.currentStep.end.localTime);
  expect(await selected.evaluate(element => Boolean(element.compareDocumentPosition(document.querySelector('.drilldown-annual-summary')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  expect(JSON.parse(calculationRequests()[0].body)).toEqual({ dateTime: '2024-01-20T22:07:00+08:00' });
  await expectPanelLayout(page);
  await screenshot(page, testInfo, 'calculated-real-api');

  await input.fill('2024-01-20T22:07:22');
  await expect(page.getByRole('status')).toHaveText('输入已修改，请重新分析');
  await expect(result).toHaveCount(0);
  await expectPanelLayout(page);
  await settle(page);
  expect(calculationRequests()).toHaveLength(1);
  expect(diagnostics.requests).toHaveLength(2);
  await input.press('Enter');
  await expect(result.locator('.drilldown-time-result__time time')).toHaveAttribute('datetime', '2024-01-20T22:07:22+08:00');
  expect(calculationRequests()).toHaveLength(2);
  expect(diagnostics.requests).toHaveLength(3);
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
    await expect(page.locator('.drilldown-annual-summary')).toContainText(String(year));
    await expect(page.getByRole('radio')).toHaveCount(6);
    const calculation = page.locator('.drilldown-technical');
    await expect(calculation).not.toHaveAttribute('open');
    const calculationSummary = calculation.locator(':scope > summary');
    await calculationSummary.focus();
    await calculationSummary.press('Enter');
    await expect(calculation).toHaveAttribute('open');
    const trace = calculation.getByRole('region', { name: '追溯信息', exact: true });
    await expect(trace.getByText(data.ruleVersion, { exact: true })).toBeVisible();
    await expect(trace.getByText('YQ-API-CONTRACT-1.4.0', { exact: true })).toBeVisible();
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

test('pending calculation disables input and repeated activation sends only one real request', async ({ page, diagnostics }, testInfo) => {
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
    await screenshot(page, testInfo, 'calculation-loading');
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
  ['/yunqi/current', '/api/v1/yunqi/learning/current', '加载失败'],
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
    if (path === '/yunqi/current') await expect(page.getByRole('region', { name: '全年\u202f·\u202f2024' })).toBeVisible();
    else await expect(page.getByRole('heading', { name: '年度概览', exact: true })).toBeVisible();
    expect(diagnostics.requests).toHaveLength(2);
  });
}

test('inquiry remains a no-query planning entry and invalid child routes return to current', async ({ page, diagnostics }) => {
  await page.setViewportSize({ width: 400, height: 860 });
  await page.goto('/yunqi/year');
  await expect(page.locator('.drilldown-annual-summary')).toBeVisible();
  await settle(page);
  const requestsBeforeInquiry = diagnostics.requests.length;
  await page.getByRole('navigation', { name: '更多' }).getByRole('link', { name: '问诊规划 ›', exact: true }).click();
  await expect(page).toHaveURL(/\/yunqi\/inquiry(?:\?motion=off)?$/);
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page.getByRole('heading', { name: '问诊结构化入口', exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(3);
  await expect(page.getByRole('article').getByText('规划中', { exact: true })).toHaveCount(3);
  await expect(page.getByRole('navigation', { name: '工作台导航' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '页面导航' }).getByRole('heading', { name: '问诊规划' })).toBeVisible();
  await expect(page.getByRole('main').locator('button, input, select, textarea, a, [tabindex]')).toHaveCount(0);
  await expectPanelLayout(page);
  await settle(page);
  expect(diagnostics.requests).toHaveLength(requestsBeforeInquiry);
  for (const child of ['patient', 'history', 'new']) {
    await page.goto(`/yunqi/inquiry/${child}`);
    await expect(page.getByRole('main').getByRole('heading', { name: '页面未找到', exact: true })).toBeVisible();
    await expectPanelLayout(page);
    await settle(page);
    expect(diagnostics.requests).toHaveLength(requestsBeforeInquiry);
  }
  await page.getByRole('link', { name: '返回当前五运六气', exact: true }).click();
  await expect(page.getByRole('region', { name: '全年\u202f·\u202f2024' })).toBeVisible();
  expect(diagnostics.requests.slice(requestsBeforeInquiry).map(request => new URL(request.url).pathname)).toEqual(['/api/v1/yunqi/learning/current']);
});

test('constitution keyboard loop answers one question at a time and destroys the session', async ({ page, diagnostics, motionMode }, testInfo) => {
  await page.setViewportSize({ width: 400, height: 860 });
  await page.goto('/yunqi/constitution');
  const form = page.getByRole('form', { name: '中医体质量表', exact: true });
  await expect(form).toBeVisible();
  const end = page.getByRole('button', { name: '结束并销毁答卷', exact: true });
  await expect(end).toHaveCount(0);
  const storageBefore = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  const male = form.getByRole('radio', { name: '男', exact: true });
  await male.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.constitution-question-title')).toBeFocused();
  await expect(page.locator('.constitution-position')).toHaveAttribute('aria-label', /当前第 1 题/);
  await page.keyboard.press('Tab');
  await expect(form.getByRole('radio', { name: '1 没有（根本不）', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(form.getByRole('radio', { name: '2 很少（有一点）', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  await expect(form.getByRole('radio', { name: '5 总是（非常）', exact: true })).toBeFocused();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(290); // Longer than auto-advance: focus browsing cannot start it.
  await expect(form.getByRole('radiogroup').getByRole('radio', { checked: true })).toHaveCount(0);
  await expect(form.getByRole('img', { name: /已答 0 \/ 26/ })).toBeVisible();
  await expect(page.locator('.constitution-position')).toHaveAttribute('aria-label', /当前第 1 题/);
  let responsePromise;
  for (let number = 1; number <= 26; number += 1) {
    await expect(page.locator('.constitution-position')).toHaveAttribute('aria-label', new RegExp(`当前第 ${number} 题`));
    await expect(page.locator('.constitution-question-screen')).toHaveCount(1);
    await expect(form.getByRole('radiogroup').getByRole('radio')).toHaveCount(5);
    await expect(end).toHaveCount(1);
    if (number === 26) {
      expect(diagnostics.requests.filter(request => request.url.endsWith('/constitution/assess'))).toHaveLength(0);
      responsePromise = page.waitForResponse(response => response.url().endsWith('/constitution/assess'));
    }
    await page.keyboard.press(String((number - 1) % 5 + 1));
  }
  await expect(page.getByRole('button', { name: '查看结果', exact: true })).toHaveCount(0);
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  const result = page.getByRole('region', { name: '体质测评结果', exact: true });
  await expect(result.locator('.constitution-decision h4')).toBeFocused();
  await expect(result.getByRole('img')).toHaveCount(9);
  const request = JSON.parse(diagnostics.requests.find(item => item.url.endsWith('/constitution/assess')).body);
  expect(Object.keys(request.answers)).toHaveLength(26);
  expect(Object.values(request.answers).every(value => [1, 2, 3, 4, 5].includes(value))).toBe(true);
  await result.getByText('判定说明与边界', { exact: true }).click();
  await expect(result.getByText(data.summary, { exact: true })).toBeVisible();
  await result.getByText('判定说明与边界', { exact: true }).click();
  await result.locator('.constitution-decision h4').focus();
  await screenshot(page, testInfo, 'constitution-keyboard-result');
  // Content disclosures precede the shell actions; the footer follows them in DOM.
  await page.keyboard.press('Tab');
  await expect(page.getByText('判定说明与边界', { exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByText('量表来源与适用说明', { exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByText('计算说明与版本', { exact: true })).toBeFocused();
  await expect(page.locator('summary').filter({ hasText: /^本次量表版本$/ })).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(page.locator('.panel-shell__actions').getByRole('button', { name: '返回修改', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(end).toHaveCount(1);
  await expect(end).toHaveClass(/ds-button--secondary/);
  await expect(end).toBeFocused();
  await page.keyboard.press('Enter');
  await confirmConstitutionDestruction(page, true);
  await expect(result).toHaveCount(0);
  await expect(end).toHaveCount(0);
  await expect(male).not.toBeChecked();
  await expect(form.getByRole('radiogroup', { name: '量表所用性别' })).toHaveCount(1);
  await expect(male).toBeFocused();
  expect(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }))).toEqual(storageBefore);
  expectNoPersonalDataInUrl(page, motionMode);
  expect(new URL(page.url()).hash).toBe('');
});

test('constitution reduced-motion answers retain the hold and previous restores an explicit choice', async ({ page, diagnostics }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/yunqi/constitution');
  await page.getByRole('radio', { name: '女', exact: true }).click();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await expect(page.locator('.constitution-position')).toHaveAttribute('aria-label', /当前第 2 题/);
  await expect(page.locator('.constitution-question-title')).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('.constitution-position')).toHaveAttribute('aria-label', /当前第 3 题/);
  const previous = page.getByRole('button', { name: '上一题', exact: true });
  await previous.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.constitution-position')).toHaveAttribute('aria-label', /当前第 2 题/);
  await expect(page.getByRole('radiogroup').getByRole('radio', { name: '1 没有（根本不）', exact: true })).toBeChecked();
  expect(diagnostics.requests.filter(request => request.url.endsWith('/constitution/assess'))).toHaveLength(0);
});
