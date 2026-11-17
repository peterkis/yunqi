import AxeBuilder from '@axe-core/playwright';
import { test, expect, loadCurrent, settle, screenshot } from './fixtures.mjs';
import { expectBirthComparison } from './birth-helpers.mjs';

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
  await expectBirthComparison(page, data);
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
  await expectBirthComparison(page, exact);
  expect(JSON.parse(diagnostics.requests.filter(request => request.url.endsWith('/learning/birth-comparison')).at(-1).body)).toEqual({ birthDate: '1990-05-12', birthTime: '09:30:21' });
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
  const groupCount = 5;
  const groupHeading = page.locator('.question-group-heading');
  const next = page.getByRole('button', { name: '下一组', exact: true });
  const submit = page.getByRole('button', { name: '生成体质测评结果', exact: true });
  await expect(groupHeading).toHaveText(`第 1 组 / 共 ${groupCount} 组`);
  await expect(page.getByRole('alert')).toHaveCount(0);
  for (let group = 2; group <= groupCount; group += 1) {
    await expect(next).toHaveAttribute('type', 'button');
    await next.click();
    await expect(groupHeading).toHaveText(`第 ${group} 组 / 共 ${groupCount} 组`);
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  await expect(next).toHaveCount(0);
  await expect(submit).toHaveAttribute('type', 'submit');
  await submit.click();
  await expect(page.getByRole('alert')).toContainText('题未作答');
  await expect(groupHeading).toHaveText(`第 1 组 / 共 ${groupCount} 组`);
  expect(diagnostics.requests.filter((request) => request.method === 'POST')).toHaveLength(0);
  for (let group = 1; group <= groupCount; group += 1) {
    await expect(groupHeading).toHaveText(`第 ${group} 组 / 共 ${groupCount} 组`);
    const questions = page.locator('.constitution-question');
    const questionCount = group === groupCount ? 2 : 6;
    await expect(questions).toHaveCount(questionCount);
    for (let index = 0; index < questionCount; index += 1) {
      await questions.nth(index).getByRole('radio').first().check();
    }
    await expect(page.getByRole('alert')).toHaveCount(0);
    if (group < groupCount) {
      await next.click();
      await expect(groupHeading).toHaveText(`第 ${group + 1} 组 / 共 ${groupCount} 组`);
      await expect(page.getByRole('alert')).toHaveCount(0);
    }
  }
  await expect(next).toHaveCount(0);
  await expect(page.getByText('已答 26 / 26 题', { exact: true })).toBeVisible();
  expect(diagnostics.requests.filter((request) => request.method === 'POST')).toHaveLength(0);
  const scoreResponsePromise = page.waitForResponse((response) => response.url().endsWith('/constitution/assess'));
  await submit.click();
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
