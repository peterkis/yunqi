import AxeBuilder from '@axe-core/playwright';
import { test, expect, loadCurrent, settle, screenshot } from './fixtures.mjs';

async function checkAccessibility(page, testInfo) {
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  await testInfo.attach('learning-axe-results', { body: JSON.stringify(scan, null, 2), contentType: 'application/json' });
  expect(scan.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))).toEqual([]);
}

test('current teaching view keeps other stages folded and exposes original excerpts and relationship sources by keyboard', async ({ page, diagnostics }, testInfo) => {
  await loadCurrent(page);
  const annual = page.locator('.annual-disclosure');
  await expect(annual).not.toHaveAttribute('open');
  await expect(page.locator('.timeline-item__toggle').first()).toBeHidden();
  await expect(page.getByRole('heading', { name: /^当前五运 ·/ })).toBeVisible();
  await expect(page.getByText('教学口径 · 待专家确认。五运与六气各有分段。')).toBeVisible();
  await expect(page.locator('.learning-relations > article')).toHaveCount(2);
  const sourceDetails = page.locator('.relation-hint .inline-disclosure').first();
  await sourceDetails.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(sourceDetails.locator('a').first()).toBeVisible();
  await expect(sourceDetails.locator('a').first()).toHaveAttribute('href', /^https:\/\//);
  const excerpt = page.locator('.classical-disclosure').first();
  await expect(excerpt.locator('blockquote').first()).toBeHidden();
  await excerpt.locator('summary').focus();
  await page.keyboard.press('Space');
  await expect(excerpt.locator('blockquote').first()).toBeVisible();
  await expect(excerpt.getByText('阅读释义（非原文）').first()).toBeVisible();
  await excerpt.locator('summary').press('Enter');
  await expect(excerpt.locator('blockquote').first()).toBeHidden();
  await annual.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.timeline-item__toggle').first()).toBeVisible();
  await annual.locator('summary').press('Space');
  await expect(page.locator('.timeline-item__toggle').first()).toBeHidden();
  await settle(page);
  expect(diagnostics.requests.filter((request) => request.url.endsWith('/learning/current'))).toHaveLength(1);
  await checkAccessibility(page, testInfo);
  await screenshot(page, testInfo, 'current-focused-learning');
});

test('birth comparison submits only requested precision, displays both contexts and clears edited personal data', async ({ page, diagnostics }, testInfo) => {
  await page.goto('/yunqi/birth');
  await expect(page.getByRole('heading', { name: '出生运气对照' })).toBeVisible();
  await settle(page);
  expect(diagnostics.requests).toHaveLength(0);
  const date = page.getByLabel('出生日期（公历）');
  await page.getByRole('button', { name: '查看出生与当前运气' }).click();
  await expect(page.getByRole('alert')).toContainText('请填写有效的出生日期');
  await expect(date).toBeFocused();
  await date.fill('1990-05-12');
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/learning/birth-comparison'));
  await page.getByRole('button', { name: '查看出生与当前运气' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  expect(data.birthPrecision).toBe('date');
  expect(JSON.parse(diagnostics.requests[0].body)).toEqual({ birthDate: '1990-05-12' });
  const result = page.getByRole('region', { name: '出生与当前运气对照结果' });
  await expect(result).toBeVisible();
  await expect(page.locator('.birth-candidate')).toHaveCount(data.candidates.length);
  await expect(page.locator('.birth-current time').first()).toHaveAttribute('datetime', data.current.facts.input.localTime);
  await expect(page.locator('.birth-candidate__interval time').first()).toHaveAttribute('datetime', data.candidates[0].from.localTime);
  await expect(page.locator('.birth-candidate > .ui-panel time')).toHaveCount(0);
  await checkAccessibility(page, testInfo);
  await screenshot(page, testInfo, 'birth-and-current-comparison');
  await page.getByLabel('知道出生时刻').check();
  await expect(result).toHaveCount(0);
  await page.getByLabel('出生时刻（北京时间）').fill('09:30:21');
  const exactResponsePromise = page.waitForResponse((response) => response.url().endsWith('/learning/birth-comparison'));
  await page.getByRole('button', { name: '查看出生与当前运气' }).click();
  const exactResponse = await exactResponsePromise;
  expect(exactResponse.status()).toBe(200);
  const { data: exact } = await exactResponse.json();
  expect(exact.birthPrecision).toBe('time');
  await expect(result).toBeVisible();
  await expect(page.locator('.birth-candidate > .ui-panel time').first()).toHaveAttribute('datetime', exact.candidates[0].learning.facts.input.localTime);
  await page.getByRole('button', { name: '清空本次资料' }).click();
  await expect(result).toHaveCount(0);
  await expect(date).toHaveValue('');
  await expect(page.getByLabel('知道出生时刻')).not.toBeChecked();
  expect(new URL(page.url()).search).toBe('');
});

test('constitution workflow keeps the current context, prevents partial scoring and shows all nine independent results', async ({ page, diagnostics }, testInfo) => {
  await page.goto('/yunqi/constitution');
  await expect(page.getByRole('heading', { name: '中医体质测评', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '当前运气参考', exact: true })).toBeVisible();
  await expect(page.getByRole('form', { name: '中医体质量表' })).toBeVisible();
  await page.getByRole('radio', { name: '男', exact: true }).check();
  await expect(page.locator('.question-list input:checked')).toHaveCount(0);
  while (await page.getByRole('button', { name: '下一组', exact: true }).isVisible()) {
    await page.getByRole('button', { name: '下一组', exact: true }).click();
  }
  await page.getByRole('button', { name: '生成体质测评结果', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('题未作答');
  expect(diagnostics.requests.filter((request) => request.method === 'POST')).toHaveLength(0);
  while (true) {
    const questions = page.locator('.constitution-question');
    for (let index = 0; index < await questions.count(); index += 1) {
      await questions.nth(index).getByRole('radio').first().check();
    }
    const next = page.getByRole('button', { name: '下一组', exact: true });
    if (!(await next.isVisible())) break;
    await next.click();
  }
  const scoreResponsePromise = page.waitForResponse((response) => response.url().endsWith('/constitution/assess'));
  await page.getByRole('button', { name: '生成体质测评结果', exact: true }).click();
  const scoreResponse = await scoreResponsePromise;
  expect(scoreResponse.status()).toBe(200);
  const { data } = await scoreResponse.json();
  const result = page.getByRole('region', { name: '体质测评结果' });
  await expect(result).toBeVisible();
  await expect(result.getByRole('progressbar')).toHaveCount(9);
  for (const dimension of data.results) {
    await expect(result.getByRole('progressbar', { name: `${dimension.name}转换分` })).toHaveAttribute('value', String(dimension.score));
  }
  const body = JSON.parse(diagnostics.requests.find((request) => request.url.endsWith('/constitution/assess')).body);
  expect(body.sex).toBe('male');
  expect(body.questionnaireId).toBe('GBT46939-2025');
  expect(Object.keys(body.answers)).toHaveLength(26);
  await result.scrollIntoViewIfNeeded();
  await checkAccessibility(page, testInfo);
  await screenshot(page, testInfo, 'constitution-nine-dimensions');
  await page.getByRole('radio', { name: '女', exact: true }).check();
  await expect(result).toHaveCount(0);
  await expect(page.getByText('已答 0 / 26 题', { exact: true })).toBeVisible();
  await expect(page.locator('.question-list input:checked')).toHaveCount(0);
  await page.getByRole('button', { name: '清空本次测评', exact: true }).click();
  await expect(page.getByRole('radio', { name: '女', exact: true })).not.toBeChecked();
  await expect(page.locator('.constitution-question')).toHaveCount(0);
});
