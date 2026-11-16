import AxeBuilder from '@axe-core/playwright';
import { test, expect, settle, screenshot } from './fixtures.mjs';

async function compareBirth(page, birthDate = '1990-05-12') {
  await page.getByLabel('出生日期（公历）').fill(birthDate);
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/learning/birth-comparison'));
  await page.getByRole('button', { name: '查看出生与当前运气', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  await expect(page.getByRole('region', { name: '出生与当前运气对照结果' })).toBeVisible();
  return data;
}

async function answerQuestionnaire(page) {
  const session = page.getByRole('region', { name: '本次对照体质测评', exact: true });
  await session.getByRole('radio', { name: '男', exact: true }).check();
  for (let group = 1; group <= 5; group += 1) {
    await expect(session.locator('.question-group-heading')).toHaveText(`第 ${group} 组 / 共 5 组`);
    const questions = session.locator('.constitution-question');
    const count = group === 5 ? 2 : 6;
    await expect(questions).toHaveCount(count);
    for (let index = 0; index < count; index += 1) {
      await questions.nth(index).getByRole('radio').first().check();
    }
    await expect(session.getByRole('alert')).toHaveCount(0);
    if (group < 5) await session.getByRole('button', { name: '下一组', exact: true }).click();
  }
  await expect(session.getByText('已答 26 / 26 题', { exact: true })).toBeVisible();
  return session;
}

test('same-page birth assessment reads matching annual and period passages, scores once and clears its session', async ({ page, diagnostics }, testInfo) => {
  await page.goto('/yunqi/birth');
  const data = await compareBirth(page);
  expect(data.candidates).toHaveLength(1);
  expect(diagnostics.requests.filter(request => request.url.includes('/constitution/'))).toHaveLength(0);

  const readings = [
    ['出生年度 · 经典原文', data.candidates[0].learning.annualPassages],
    ['出生阶段 · 经典原文', data.candidates[0].learning.currentPassages],
    ['当前年度 · 经典原文', data.current.annualPassages],
    ['当前阶段 · 经典原文', data.current.currentPassages],
  ];
  for (const [title, passages] of readings) {
    const disclosure = page.locator('.classical-disclosure').filter({ has: page.getByText(title, { exact: true }) });
    await expect(disclosure).not.toHaveAttribute('open');
    await disclosure.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(disclosure.locator('blockquote')).toHaveCount(passages.length);
    for (let index = 0; index < passages.length; index += 1) {
      await expect(disclosure.locator('blockquote').nth(index)).toHaveText(passages[index].quote);
    }
    if (title.startsWith('出生阶段')) {
      await expect(disclosure.getByText('出生阶段', { exact: true })).toBeVisible();
      await expect(disclosure.getByText('当前阶段', { exact: true })).toHaveCount(0);
    }
    if (title.startsWith('出生年度')) {
      const originalViewport = page.viewportSize();
      await page.setViewportSize({ width: 320, height: 800 });
      const narrowReading = await disclosure.evaluate(element => ({
        viewport: document.documentElement.clientWidth,
        page: document.documentElement.scrollWidth,
        quotes: [...element.querySelectorAll('blockquote')].map(quote => ({ width: quote.clientWidth, scroll: quote.scrollWidth })),
      }));
      expect(narrowReading.page).toBeLessThanOrEqual(narrowReading.viewport + 1);
      for (const quote of narrowReading.quotes) expect(quote.scroll).toBeLessThanOrEqual(quote.width + 1);
      await screenshot(page, testInfo, 'birth-classical-reading-narrow');
      await page.setViewportSize(originalViewport);
    }
    await disclosure.locator('summary').press('Enter');
    await expect(disclosure).not.toHaveAttribute('open');
  }

  const start = page.getByRole('button', { name: '开始本次体质测评', exact: true });
  await start.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '本次体质测评', exact: true })).toBeFocused();
  const session = await answerQuestionnaire(page);
  await expect(page.getByRole('form', { name: '中医体质量表', exact: true })).toHaveCount(1);
  await expect(page.locator('form form')).toHaveCount(0);
  const context = page.getByRole('complementary', { name: '本次测评对照背景', exact: true });
  await expect(context).toBeVisible();
  await expect(context.locator(`time[datetime="${data.current.facts.input.localTime}"]`)).toHaveCount(1);
  expect(diagnostics.requests.filter(request => request.url.endsWith('/constitution/questionnaire'))).toHaveLength(1);
  expect(diagnostics.requests.filter(request => request.url.endsWith('/constitution/assess'))).toHaveLength(0);
  expect(diagnostics.requests.filter(request => request.url.endsWith('/learning/current'))).toHaveLength(0);

  const scoreResponsePromise = page.waitForResponse(response => response.url().endsWith('/constitution/assess'));
  await session.getByRole('button', { name: '生成体质测评结果', exact: true }).click();
  const scoreResponse = await scoreResponsePromise;
  expect(scoreResponse.status()).toBe(200);
  const { data: assessment } = await scoreResponse.json();
  const results = session.getByRole('region', { name: '体质测评结果', exact: true });
  await expect(results).toBeVisible();
  await expect(results.getByRole('progressbar')).toHaveCount(9);
  for (const dimension of assessment.results) {
    await expect(results.getByRole('progressbar', { name: `${dimension.name}转换分` })).toHaveAttribute('value', String(dimension.score));
  }
  const scoreRequests = diagnostics.requests.filter(request => request.url.endsWith('/constitution/assess'));
  expect(scoreRequests).toHaveLength(1);
  const requestBody = JSON.parse(scoreRequests[0].body);
  expect(Object.keys(requestBody).sort()).toEqual(['answers', 'questionnaireId', 'sex']);
  expect(Object.keys(requestBody.answers)).toHaveLength(26);
  await results.scrollIntoViewIfNeeded();
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  await testInfo.attach('birth-assessment-axe-results', { body: JSON.stringify(scan, null, 2), contentType: 'application/json' });
  expect(scan.violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target) }))).toEqual([]);
  await screenshot(page, testInfo, 'birth-assessment-nine-results');

  await page.getByRole('button', { name: '结束本次测评', exact: true }).click();
  await expect(session.getByRole('form', { name: '中医体质量表', exact: true })).toHaveCount(0);
  await expect(start).toHaveAttribute('aria-expanded', 'false');
  await expect(start).toBeFocused();
  await start.click();
  await expect(page.getByRole('radio', { name: '男', exact: true })).not.toBeChecked();
  await expect(page.getByRole('region', { name: '体质测评结果', exact: true })).toHaveCount(0);
  await page.getByRole('radio', { name: '女', exact: true }).check();
  await expect(page.getByText('已答 0 / 26 题', { exact: true })).toBeVisible();
  await page.locator('.constitution-question').first().getByRole('radio').first().check();
  await expect(page.getByText('已答 1 / 26 题', { exact: true })).toBeVisible();
  await compareBirth(page, '1990-05-13');
  await expect(session.getByRole('form', { name: '中医体质量表', exact: true })).toHaveCount(0);
  await expect(start).toHaveAttribute('aria-expanded', 'false');
  await start.click();
  await expect(page.getByRole('radio', { name: '女', exact: true })).not.toBeChecked();
  await expect(page.locator('.constitution-question')).toHaveCount(0);
  await page.getByRole('button', { name: '清空本次资料', exact: true }).click();
  await expect(session).toHaveCount(0);
  await expect(page.getByRole('region', { name: '出生与当前运气对照结果' })).toHaveCount(0);
  expect(new URL(page.url()).search).toBe('');
  expect(diagnostics.requests.filter(request => request.url.endsWith('/learning/current'))).toHaveLength(0);
});

test('same-page assessment ignores an older real scoring response after birth inputs create a new session', async ({ page, diagnostics }) => {
  await page.goto('/yunqi/birth');
  await compareBirth(page);
  await page.getByRole('button', { name: '开始本次体质测评', exact: true }).click();
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
    await session.getByRole('button', { name: '生成体质测评结果', exact: true }).click();
    expect(await reachedBackend).toBe(200);
    await expect(session.getByRole('status')).toHaveText('正在按量表规则计分');
    await expect(page.getByLabel('出生日期（公历）')).toBeEnabled();
    await compareBirth(page, '1991-06-01');
    await expect(session.getByRole('form', { name: '中医体质量表', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '开始本次体质测评', exact: true })).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('button', { name: '开始本次体质测评', exact: true }).click();
    await expect(page.getByRole('radio', { name: '男', exact: true })).not.toBeChecked();
    releaseResponse();
    expect((await oldResponse).status()).toBe(200);
    await settle(page);
    await expect(page.getByRole('region', { name: '体质测评结果', exact: true })).toHaveCount(0);
    await expect(page.locator('.constitution-question')).toHaveCount(0);
    await page.getByRole('radio', { name: '女', exact: true }).check();
    await expect(page.getByText('已答 0 / 26 题', { exact: true })).toBeVisible();
    expect(diagnostics.requests.filter(request => request.url.endsWith('/constitution/assess'))).toHaveLength(1);
    expect(diagnostics.requests.filter(request => request.url.endsWith('/learning/current'))).toHaveLength(0);
  } finally {
    releaseResponse();
    await page.unrouteAll({ behavior: 'wait' });
  }
});
