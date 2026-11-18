import { test, expect, settle, screenshot, expectCompactTimes, scanAccessibility, expectNoPersonalDataInUrl, waitForAnimations } from './fixtures.mjs';
import { expectBirthComparison, expectBirthMirror, expectBirthReadings, expandBirthInput, fillBirthDate, expectBirthDate } from './birth-helpers.mjs';
import { answerConstitution, expectConstitutionResults, confirmConstitutionDestruction } from './constitution-helpers.mjs';
import { expectTextLink } from './consistency-helpers.mjs';
import { expectClassicsCards } from './visual-assertions.mjs';

async function compareBirth(page, birthDate = '1990-05-12') {
  if (await page.getByRole('button', { name: '修改', exact: true }).count()) await expandBirthInput(page);
  await fillBirthDate(page, birthDate);
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/learning/birth-comparison'));
  await page.getByRole('button', { name: '查看对照', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  await expect(page.getByRole('region', { name: '出生与当前运气对照结果' })).toBeVisible();
  return data;
}

async function answerQuestionnaire(page) {
  const session = page.getByRole('region', { name: '本次对照体质测评', exact: true });
  await answerConstitution(page, session);
  return session;
}

// 2-constraints.md: the medical-boundary notice must stay on screen with every disease passage,
// including after scrolling the readings and expanding long passages.
async function expectBirthNoticePinned(page, reading) {
  const notice = reading.getByText('出生时令结构不等于体质，原文病候是文献线索而非发病预测。请与体质量表、四诊互参。', { exact: true });
  await expect(notice).toHaveCount(1);
  const readings = reading.getByRole('region', { name: '出生原文阅读区', exact: true });
  for (const position of ['bottom', 'top']) {
    await readings.evaluate((element, to) => { element.scrollTop = to === 'bottom' ? element.scrollHeight : 0; }, position);
    await expect(notice).toBeInViewport({ ratio: 1 });
  }
  expect(await page.locator('.panel-shell__content').evaluate(element => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
}

test('same-page birth assessment reads matching annual and period passages, scores once and clears its session', async ({ page, diagnostics, motionMode }, testInfo) => {
  await page.goto('/yunqi/birth');
  const data = await compareBirth(page);
  await expectBirthComparison(page, data);
  await expectBirthMirror(page);
  expect(data.candidates).toHaveLength(1);
  expect(diagnostics.requests.filter(request => request.url.includes('/constitution/'))).toHaveLength(0);

  const allReadings = page.getByRole('link', { name: '全部原文', exact: true });
  await allReadings.focus();
  await allReadings.press('Enter');
  await expect(page).toHaveURL(/\/yunqi\/birth\/classics(?:\?motion=off)?$/);
  await expect(page.getByRole('navigation', { name: '工作台导航' })).toHaveCount(0);
  const reading = page.getByRole('region', { name: '先天原文与释义', exact: true });
  const historical = reading.locator('.birth-reading-candidate').first();
  await expect(reading.getByRole('button', { name: '出生阶段', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expectBirthReadings(historical, data.candidates[0].learning.currentPassages);
  await expectTextLink(page, historical.getByRole('link', { name: /^出处/ }).first());
  await expectClassicsCards(page, testInfo);
  await expect(reading.locator('.classics-card--current')).toHaveCount(0);
  await expect(historical.getByText('出生阶段', { exact: true })).toBeVisible();
  await expect(historical.getByText('当下阶段', { exact: true })).toHaveCount(0);
  await reading.getByRole('button', { name: '全年', exact: true }).click();
  await expectBirthReadings(historical, data.candidates[0].learning.annualPassages);
  const current = reading.locator('.birth-current-readings');
  await expect(current).not.toHaveAttribute('open');
  await current.locator(':scope > summary').focus();
  await current.locator(':scope > summary').press('Space');
  await expectBirthReadings(current, [...data.current.annualPassages, ...data.current.currentPassages]);
  await expectBirthNoticePinned(page, reading);
  await current.locator(':scope > summary').press('Enter');
  await expect(current).not.toHaveAttribute('open');
  const originalViewport = page.viewportSize();
  await page.setViewportSize({ width: 400, height: 640 });
  await waitForAnimations(page);
  const panelReading = await reading.evaluate(element => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
    quotes: [...element.querySelectorAll('blockquote')].filter(quote => quote.getClientRects().length).map(quote => ({ width: quote.clientWidth, scroll: quote.scrollWidth })),
  }));
  expect(panelReading.page).toBeLessThanOrEqual(panelReading.viewport + 1);
  for (const quote of panelReading.quotes) expect(quote.scroll).toBeLessThanOrEqual(quote.width + 1);
  await expectBirthNoticePinned(page, reading);
  await screenshot(page, testInfo, 'birth-classical-reading-min-height');
  await page.setViewportSize(originalViewport);
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await expect(allReadings).toBeFocused();
  expect(diagnostics.requests.filter(request => request.url.endsWith('/learning/birth-comparison'))).toHaveLength(1);

  const start = page.getByRole('button', { name: '同时测评体质', exact: true });
  await start.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '本次体质测评', exact: true })).toBeFocused();
  const session = await answerQuestionnaire(page);
  await expect(page.getByRole('form', { name: '中医体质量表', exact: true })).toHaveCount(1);
  await expect(page.locator('form form')).toHaveCount(0);
  const context = page.getByRole('complementary', { name: '本次测评对照背景', exact: true });
  await expect(context).toBeVisible();
  await expect(page.locator(`.constitution-time-details .constitution-context-time time[datetime="${data.current.facts.input.localTime}"]`)).toHaveCount(1);
  expect(diagnostics.requests.filter(request => request.url.endsWith('/constitution/questionnaire'))).toHaveLength(1);
  expect(diagnostics.requests.filter(request => request.url.endsWith('/constitution/assess'))).toHaveLength(0);
  expect(diagnostics.requests.filter(request => request.url.endsWith('/learning/current'))).toHaveLength(0);

  const scoreResponsePromise = page.waitForResponse(response => response.url().endsWith('/constitution/assess'));
  await page.locator('.panel-shell__actions').getByRole('button', { name: '查看结果', exact: true }).click();
  const scoreResponse = await scoreResponsePromise;
  expect(scoreResponse.status()).toBe(200);
  const { data: assessment } = await scoreResponse.json();
  const results = await expectConstitutionResults(page, assessment, session);
  const scoreRequests = diagnostics.requests.filter(request => request.url.endsWith('/constitution/assess'));
  expect(scoreRequests).toHaveLength(1);
  const requestBody = JSON.parse(scoreRequests[0].body);
  expect(Object.keys(requestBody).sort()).toEqual(['answers', 'questionnaireId', 'sex']);
  expect(Object.keys(requestBody.answers)).toHaveLength(26);
  await results.scrollIntoViewIfNeeded();
  const scan = await scanAccessibility(page);
  await testInfo.attach('birth-assessment-axe-results', { body: JSON.stringify(scan, null, 2), contentType: 'application/json' });
  expect(scan.violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target) }))).toEqual([]);
  await screenshot(page, testInfo, 'birth-assessment-nine-results');

  const actions = page.locator('.panel-shell__actions');
  const end = actions.getByRole('button', { name: '结束并销毁答卷', exact: true });
  await page.locator('.birth-technical > summary').focus();
  await page.keyboard.press('Tab');
  await expect(actions.getByRole('button', { name: '返回修改', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(end).toBeFocused();
  await page.keyboard.press('Enter');
  await confirmConstitutionDestruction(page, true);
  await expect(results).toHaveCount(0);
  await expect(end).toHaveCount(0);
  await expect(session.getByRole('form', { name: '中医体质量表', exact: true })).toHaveCount(0);
  await expect(start).toHaveAttribute('aria-expanded', 'false');
  await expect(start).toBeFocused();
  await start.click();
  await expect(page.getByRole('radio', { name: '男', exact: true })).not.toBeChecked();
  await expect(page.locator('.panel-shell__actions').getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '体质测评结果', exact: true })).toHaveCount(0);
  await page.getByRole('radio', { name: '女', exact: true }).click();
  await expect(page.getByRole('img', { name: /已答 0 \/ 26/ })).toBeVisible();
  await expect(page.locator('.panel-shell__actions').getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveCount(1);
  await page.locator('.constitution-question-screen').first().getByRole('radio').first().click();
  await expect(page.getByRole('img', { name: /已答 1 \/ 26/ })).toBeVisible();
  await allReadings.click();
  await expect(page.getByRole('form', { name: '中医体质量表', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await expect(page.getByRole('img', { name: /已答 1 \/ 26/ })).toBeVisible();
  await expect(page.locator('.constitution-sex-summary')).toContainText('体质维度 · 女性版更换');
  await compareBirth(page, '1990-05-13');
  await expect(session.getByRole('form', { name: '中医体质量表', exact: true })).toHaveCount(0);
  await expect(start).toHaveAttribute('aria-expanded', 'false');
  await start.click();
  await expect(page.getByRole('radio', { name: '女', exact: true })).not.toBeChecked();
  await expect(page.locator('.constitution-question-screen')).toHaveCount(0);
  await page.getByRole('button', { name: '清空本次资料', exact: true }).click();
  await expect(session).toHaveCount(0);
  await expect(page.getByRole('region', { name: '出生与当前运气对照结果' })).toHaveCount(0);
  expectNoPersonalDataInUrl(page, motionMode);
  expect(diagnostics.requests.filter(request => request.url.endsWith('/learning/current'))).toHaveLength(0);
});

test('same-page assessment ignores an older real scoring response after birth inputs create a new session', async ({ page, diagnostics }) => {
  await page.goto('/yunqi/birth');
  await compareBirth(page);
  await page.getByRole('button', { name: '同时测评体质', exact: true }).click();
  const session = await answerQuestionnaire(page);
  let releaseResponse;
  let receivedResponse;
  const hold = new Promise(resolve => { releaseResponse = resolve; });
  const reachedBackend = new Promise(resolve => { receivedResponse = resolve; });
  // The body and status come from the real Service; only delivery timing is controlled.
  await page.route('**/api/v1/constitution/assess', async route => {
    const response = await route.fetch();
    receivedResponse(response.status());
    await hold;
    await route.fulfill({ response });
  });
  const oldResponse = page.waitForResponse(response => response.url().endsWith('/constitution/assess'));
  try {
    await page.locator('.panel-shell__actions').getByRole('button', { name: '查看结果', exact: true }).click();
    expect(await reachedBackend).toBe(200);
    await expect(session.getByRole('status')).toHaveText('正在按量表规则计分');
    await expandBirthInput(page);
    await expect(page.getByRole('textbox', { name: '年', exact: true })).toBeEnabled();
    await compareBirth(page, '1991-06-01');
    await expect(session.getByRole('form', { name: '中医体质量表', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '同时测评体质', exact: true })).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('button', { name: '同时测评体质', exact: true }).click();
    await expect(page.getByRole('radio', { name: '男', exact: true })).not.toBeChecked();
    releaseResponse();
    expect((await oldResponse).status()).toBe(200);
    await settle(page);
    await expect(page.getByRole('region', { name: '体质测评结果', exact: true })).toHaveCount(0);
    await expect(page.locator('.panel-shell__actions').getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveCount(0);
    await expect(page.locator('.constitution-question-screen')).toHaveCount(0);
    await page.getByRole('radio', { name: '女', exact: true }).click();
    await expect(page.getByRole('img', { name: /已答 0 \/ 26/ })).toBeVisible();
    expect(diagnostics.requests.filter(request => request.url.endsWith('/constitution/assess'))).toHaveLength(1);
    expect(diagnostics.requests.filter(request => request.url.endsWith('/learning/current'))).toHaveLength(0);
  } finally {
    releaseResponse();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test('birth comparison retains every real boundary candidate, its canonical interval and one shared questionnaire', async ({ page, diagnostics, motionMode }, testInfo) => {
  await page.goto('/yunqi/birth');
  const storageBefore = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  const initial = await compareBirth(page);
  // Use the real API's current year boundary, not a second calendar oracle.
  const boundaryDate = initial.current.facts.interval.start.localTime.slice(0, 10);
  const data = await compareBirth(page, boundaryDate);
  expect(data.birthPrecision).toBe('date');
  expect(data.ambiguous).toBe(true);
  expect(data.candidates.length).toBeGreaterThan(1);
  await expectBirthComparison(page, data);
  await expectBirthMirror(page);
  await page.getByRole('link', { name: '全部原文', exact: true }).click();
  const reading = page.getByRole('region', { name: '先天原文与释义', exact: true });
  const candidates = reading.locator('.birth-reading-candidate');
  await expect(candidates).toHaveCount(data.candidates.length);
  for (const [index, candidate] of data.candidates.entries()) {
    await expectBirthReadings(candidates.nth(index), candidate.learning.currentPassages);
    await expect(candidates.nth(index).locator('time').first()).toHaveAttribute('datetime', candidate.from.localTime);
    await expect(candidates.nth(index).locator('time').last()).toHaveAttribute('datetime', candidate.until.localTime);
  }
  await screenshot(page, testInfo, 'birth-boundary-all-originals');
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await page.getByRole('button', { name: '同时测评体质', exact: true }).click();
  await expect(page.getByRole('form', { name: '中医体质量表', exact: true })).toHaveCount(1);
  const context = page.getByRole('complementary', { name: '本次测评对照背景', exact: true });
  await expect(context.getByText(`${data.candidates.length} 个候选`, { exact: true })).toBeVisible();
  const notes = page.locator('.constitution-notes');
  await notes.getByText('本次对照快照与候选区间', { exact: true }).click();
  const candidateDetails = notes.locator('.constitution-birth-candidate');
  await expect(candidateDetails).toHaveCount(data.candidates.length);
  for (const [index, candidate] of data.candidates.entries()) {
    const row = candidateDetails.nth(index);
    await expect(row).toBeVisible();
    await expect(row.locator('time').first()).toHaveAttribute('datetime', candidate.from.localTime);
    await expect(row.locator('time').last()).toHaveAttribute('datetime', candidate.until.localTime);
  }
  expect(diagnostics.requests.filter(request => request.url.endsWith('/constitution/questionnaire'))).toHaveLength(1);
  expect(diagnostics.requests.filter(request => request.url.endsWith('/learning/current'))).toHaveLength(0);
  await page.getByRole('button', { name: '清空本次资料', exact: true }).click();
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByRole('region', { name: '本次对照体质测评', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }))).toEqual(storageBefore);
  expectNoPersonalDataInUrl(page, motionMode);
  expect(new URL(page.url()).hash).toBe('');
});

test('birth inputs enforce required time, block repeated pending activation and hide results on every edit', async ({ page, diagnostics }) => {
  await page.goto('/yunqi/birth');
  await settle(page);
  expect(diagnostics.requests).toHaveLength(0);
  const date = page.getByRole('textbox', { name: '年', exact: true });
  await fillBirthDate(page, '1990-05-12');
  await page.getByRole('radio', { name: '已知时刻', exact: true }).click();
  const time = page.getByLabel('出生时刻（北京时间）');
  await page.getByRole('button', { name: '查看对照', exact: true }).click();
  await expect(time).toBeFocused();
  await expect(page.getByRole('alert')).toContainText('请填写有效的出生日期');
  expect(diagnostics.requests).toHaveLength(0);
  await time.fill('09:30');

  let release;
  let received;
  const hold = new Promise(resolve => { release = resolve; });
  const reached = new Promise(resolve => { received = resolve; });
  await page.route(url => url.pathname.endsWith('/learning/birth-comparison'), async route => {
    const response = await route.fetch();
    received(response.status());
    await hold;
    await route.fulfill({ response });
  });
  try {
    let responseDelivered = false;
    const responsePromise = page.waitForResponse(response => response.url().endsWith('/learning/birth-comparison')).then(response => {
      responseDelivered = true;
      return response;
    });
    await page.getByRole('button', { name: '查看对照', exact: true }).click();
    expect(await reached).toBe(200);
    await expect(date).toBeDisabled();
    await expect(time).toBeDisabled();
    await expect(page.getByRole('radio', { name: '已知时刻', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: '清空本次资料', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: '正在对照…', exact: true })).toBeDisabled();
    await expect(page.getByRole('form', { name: '出生运气输入' })).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('region', { name: '出生与当前运气对照结果', exact: true })).toHaveCount(0);
    await page.getByRole('form', { name: '出生运气输入' }).evaluate(form => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.keyboard.press('Enter');
    const requests = diagnostics.requests.filter(request => request.url.endsWith('/learning/birth-comparison'));
    expect(requests).toHaveLength(1);
    expect(JSON.parse(requests[0].body)).toEqual({ birthDate: '1990-05-12', birthTime: '09:30:00' });
    expect(responseDelivered, 'The real response remains held during pending assertions').toBe(false);
    release();
    const response = await responsePromise;
    const { data } = await response.json();
    expect(data.birthPrecision).toBe('time');
    await expectBirthComparison(page, data);
    expect(diagnostics.requests.filter(request => request.url.endsWith('/learning/birth-comparison'))).toHaveLength(1);
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }

  const result = page.getByRole('region', { name: '出生与当前运气对照结果', exact: true });
  await expect(page.getByRole('group', { name: '出生资料摘要' })).toContainText('1990-05-12 · 09:30 · 修改');
  await expandBirthInput(page);
  await time.fill('09:31:21');
  await expect(result).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('原结果已隐藏');
  await compareBirth(page, '1990-05-12');
  await expect(page.getByRole('group', { name: '出生资料摘要' })).toContainText('09:31');
  await expectCompactTimes(page);
  await expandBirthInput(page);
  await fillBirthDate(page, '1990-05-13');
  await expect(result).toHaveCount(0);
  await compareBirth(page, '1990-05-13');
  await expandBirthInput(page);
  await page.getByRole('radio', { name: '时刻不详', exact: true }).click();
  await expect(result).toHaveCount(0);
  await compareBirth(page, '1990-05-13');
  await page.getByRole('button', { name: '清空本次资料', exact: true }).click();
  await expect(result).toHaveCount(0);
  await expectBirthDate(page, '');
  await expect(page.getByRole('radio', { name: '已知时刻', exact: true })).not.toBeChecked();
  await expect(time).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('direct or reloaded birth classics never restore personal data or make an automatic comparison', async ({ page, diagnostics }) => {
  await page.goto('/yunqi/birth/classics');
  await expect(page.getByRole('heading', { name: '原文与释义', exact: true })).toBeVisible();
  await expect(page.getByText('本页尚无出生对照，请先填写出生资料。', { exact: true })).toBeVisible();
  await settle(page);
  expect(diagnostics.requests).toHaveLength(0);
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await expectBirthDate(page, '');
  await compareBirth(page);
  await page.getByRole('link', { name: '全部原文', exact: true }).click();
  // Full motion commits navigation in the browser's snapshot callback.
  // Click completion alone does not mean reload will use the target URL.
  await expect(page).toHaveURL(/\/yunqi\/birth\/classics(?:\?motion=off)?$/);
  await expect(page.getByRole('heading', { name: '原文与释义', exact: true })).toBeVisible();
  const requestCount = diagnostics.requests.length;
  await page.reload();
  await expect(page).toHaveURL(/\/yunqi\/birth\/classics(?:\?motion=off)?$/);
  await expect(page.getByRole('heading', { name: '原文与释义', exact: true })).toBeVisible();
  await expect(page.getByText('本页尚无出生对照，请先填写出生资料。', { exact: true })).toBeVisible();
  await settle(page);
  expect(diagnostics.requests).toHaveLength(requestCount);
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await expectBirthDate(page, '');
  await expect(page.getByRole('region', { name: '出生与当前运气对照结果', exact: true })).toHaveCount(0);
});
