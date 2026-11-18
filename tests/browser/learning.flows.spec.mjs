import AxeBuilder from '@axe-core/playwright';
import { test, expect, loadCurrent, settle, screenshot } from './fixtures.mjs';
import { expectBirthComparison, expandBirthInput, fillBirthDate, expectBirthDate } from './birth-helpers.mjs';
import { answerConstitution, expectConstitutionResults, changeConstitutionSex } from './constitution-helpers.mjs';
import { expectClassicsAlignment, expectRelationSources, expectTextLink } from './consistency-helpers.mjs';
import { expectCurrentStageFacts, expectMovementRelation } from './stage-facts-helpers.mjs';
import { expectClassicsCards } from './visual-assertions.mjs';

async function checkAccessibility(page, testInfo) {
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  await testInfo.attach('learning-axe-results', { body: JSON.stringify(scan, null, 2), contentType: 'application/json' });
  expect(scan.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))).toEqual([]);
}

test('current cards retain real API facts, folded stages and sourced original readings with keyboard navigation', async ({ page, diagnostics }, testInfo) => {
  const data = await loadCurrent(page);
  expect(data.movements).toHaveLength(5);
  const otherStages = page.locator('.current-all-stages');
  await expect(otherStages).not.toHaveAttribute('open');
  await expect(page.locator('.current-stage-row button').first()).toBeHidden();
  const now = page.locator('.current-overview__now');
  await expect(now.getByRole('heading', { name: data.currentMovement.name, exact: true })).toBeVisible();
  await expect(now.getByText('北京时间 UTC+08', { exact: true })).toHaveCount(0);
  await expect(page.locator('.current-year-wheel').getByRole('img')).toHaveAttribute('aria-label', /年轮：外环六步气，当前.*；内环五步运，当前/);
  await expect(page.locator('.current-sixqi-progress')).toHaveCount(0);
  await expectCurrentStageFacts(page, data);
  const movement = now.getByRole('region', { name: '当步运' });
  await expect(movement.locator('.ds-relation')).toHaveCount(1);
  await expect(movement).not.toContainText('关系未提供');
  await expect(movement).not.toContainText('主运与客运并列展示。');
  const sourceDetails = page.locator('.current-relations');
  await sourceDetails.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(sourceDetails.getByText(data.currentQi.explanation, { exact: true })).toBeVisible();
  await expect(sourceDetails.getByText(data.annualRelation.explanation, { exact: true })).toBeVisible();
  await expect(sourceDetails.locator('a').first()).toHaveAttribute('href', data.annualRelation.sources[0].url);
  await expectRelationSources(sourceDetails);
  await expect(page.getByRole('contentinfo')).toContainText('教学口径，待专家确认');
  expect(await page.getByRole('contentinfo').evaluate(footer => footer.textContent.match(/教学口径，待专家确认/g)?.length)).toBe(1);
  await sourceDetails.locator('summary').press('Space');
  await expect(sourceDetails.locator('a').first()).toBeHidden();
  await otherStages.locator(':scope > summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.current-stage-row button').first()).toBeVisible();
  await expect(page.getByRole('region', { name: '五步运全表' }).getByRole('heading')).toHaveCount(data.movements.length);
  for (const step of data.movements) {
    await expectMovementRelation(page.getByRole('region', { name: '五步运全表' }).getByRole('region', { name: step.name, exact: true }), step);
  }
  await otherStages.locator(':scope > summary').press('Space');
  await expect(page.locator('.current-stage-row button').first()).toBeHidden();
  await expect(page.getByText('文献线索，非个体发病预测', { exact: true })).toHaveCount(1);
  await settle(page);
  expect(diagnostics.requests.filter((request) => request.url.endsWith('/learning/current'))).toHaveLength(1);
  await checkAccessibility(page, testInfo);
  await screenshot(page, testInfo, 'current-focused-learning');

  // Activate the card's stretched area, outside the link text; SPA navigation
  // must preserve this document and must not issue a document request.
  await expectTextLink(page, page.getByRole('link', { name: '原文与释义', exact: true }));
  await page.evaluate(() => { window.c3NavigationSentinel = 'same-document'; });
  await page.locator('.current-overview__quote').scrollIntoViewIfNeeded();
  const cardBody = await page.locator('.current-overview__quote .ds-info-card__content').boundingBox();
  expect(cardBody).not.toBeNull();
  await page.mouse.click(cardBody.x + cardBody.width / 2, cardBody.y + cardBody.height / 2);
  await expect(page).toHaveURL(/\/yunqi\/current\/classics$/);
  expect(await page.evaluate(() => window.c3NavigationSentinel)).toBe('same-document');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page.getByRole('button', { name: '当下阶段', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '当下阶段', exact: true })).toHaveCSS('height', '30px');
  await expect(page.getByText('正在此段', { exact: true })).toBeVisible();
  await expect(page.getByText('原 文', { exact: true })).toBeVisible();
  await expect(page.getByText('释 义', { exact: true })).toBeVisible();
  await expect(page.locator('.classics-card--current')).toHaveCount(data.currentPassages.length);
  await expectClassicsCards(page, testInfo);
  await expectClassicsAlignment(page);
  const notice = page.getByText('原文为文献线索，非个体发病预测', { exact: true });
  await expect(notice).toBeInViewport({ ratio: 1 });
  const currentSource = page.getByRole('link', { name: /^出处/ }).first();
  await expect(currentSource).toHaveAttribute('href', data.currentPassages[0].sourceUrl);
  await expectTextLink(page, currentSource);
  const annualScope = page.getByRole('button', { name: '全年', exact: true });
  await annualScope.focus();
  await page.keyboard.press('Enter');
  await expect(annualScope).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('正在此段', { exact: true })).toHaveCount(0);
  const cards = page.locator('.current-classics__readings > .classics-card');
  await expect(cards).toHaveCount(data.annualPassages.length);
  await expect(cards.locator('.classics-card__badge')).toHaveText(data.annualPassages.map(() => '全年适用'));
  await expect(page.locator('.classics-card--current')).toHaveCount(0);
  await expectClassicsCards(page, testInfo);
  await expectClassicsAlignment(page);
  for (let index = 0; index < data.annualPassages.length; index += 1) {
    const passage = data.annualPassages[index];
    const card = cards.nth(index);
    await expect(card.getByRole('link', { name: /^出处/ })).toHaveAttribute('href', passage.sourceUrl);
    await expect(card.getByText(passage.explanation, { exact: true })).toBeVisible();
    const full = card.locator('details');
    if (passage.quote.length > 90) {
      await full.locator('summary').focus();
      await page.keyboard.press('Space');
      await expect(full.locator('blockquote p')).toHaveText(passage.quote);
      await expect(full.locator('blockquote')).toBeVisible();
      await full.locator('blockquote').scrollIntoViewIfNeeded();
      await expect(notice).toBeInViewport({ ratio: 1 });
      await full.locator('summary').press('Enter');
      await expect(full.locator('blockquote')).toBeHidden();
    } else {
      await expect(card.locator('blockquote p')).toHaveText(passage.quote);
    }
  }
  await expect(notice).toHaveCount(1);
  await expect(notice).toBeInViewport();
  const readings = page.getByRole('region', { name: '全年原文', exact: true });
  for (const end of ['bottom', 'top']) {
    await readings.evaluate((region, end) => { region.scrollTop = end === 'bottom' ? region.scrollHeight : 0; }, end);
    await expect(notice).toBeInViewport({ ratio: 1 });
  }
  await settle(page);
  expect(diagnostics.requests.filter((request) => request.url.endsWith('/learning/current'))).toHaveLength(2);
  await checkAccessibility(page, testInfo);
  await screenshot(page, testInfo, 'current-classics-annual');
  // A direct reload has no prior browser history requirement for returning.
  await page.reload();
  await expect(page.getByRole('group', { name: '原文范围' })).toBeVisible();
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await expect(page.getByRole('region', { name: '全年\u202f·\u202f2024' })).toBeVisible();
});

test('birth comparison submits only requested precision, displays both contexts and clears edited personal data', async ({ page, diagnostics }, testInfo) => {
  await page.goto('/yunqi/birth');
  await expect(page.getByRole('heading', { name: '出生运气对照' })).toBeVisible();
  await settle(page);
  expect(diagnostics.requests).toHaveLength(0);
  const date = page.getByRole('textbox', { name: '年', exact: true });
  await page.getByRole('button', { name: '查看对照' }).click();
  await expect(page.getByRole('alert')).toContainText('请填写有效的出生日期');
  await expect(date).toBeFocused();
  await fillBirthDate(page, '1990-05-12');
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/learning/birth-comparison'));
  await page.getByRole('button', { name: '查看对照' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  expect(data.birthPrecision).toBe('date');
  expect(JSON.parse(diagnostics.requests[0].body)).toEqual({ birthDate: '1990-05-12' });
  const result = page.getByRole('region', { name: '出生与当前运气对照结果' });
  await expectBirthComparison(page, data);
  const birthRelations = result.locator('.birth-relation-details').first();
  await birthRelations.locator(':scope > summary').press('Enter');
  await expectRelationSources(birthRelations);
  await birthRelations.locator(':scope > summary').press('Space');
  await checkAccessibility(page, testInfo);
  await screenshot(page, testInfo, 'birth-and-current-comparison');
  await expandBirthInput(page);
  await page.getByRole('radio', { name: '已知时刻', exact: true }).click();
  await expect(result).toHaveCount(0);
  await page.getByLabel('出生时刻（北京时间）').fill('09:30:21');
  const exactResponsePromise = page.waitForResponse((response) => response.url().endsWith('/learning/birth-comparison'));
  await page.getByRole('button', { name: '查看对照' }).click();
  const exactResponse = await exactResponsePromise;
  expect(exactResponse.status()).toBe(200);
  const { data: exact } = await exactResponse.json();
  expect(exact.birthPrecision).toBe('time');
  await expectBirthComparison(page, exact);
  expect(JSON.parse(diagnostics.requests.filter(request => request.url.endsWith('/learning/birth-comparison')).at(-1).body)).toEqual({ birthDate: '1990-05-12', birthTime: '09:30:21' });
  await page.getByRole('button', { name: '清空本次资料' }).click();
  await expect(result).toHaveCount(0);
  await expectBirthDate(page, '');
  await expect(page.getByRole('radio', { name: '已知时刻', exact: true })).not.toBeChecked();
  expect(new URL(page.url()).search).toBe('');
});

test('constitution workflow keeps its snapshot, prevents partial scoring and preserves all nine results', async ({ page, diagnostics }, testInfo) => {
  await page.goto('/yunqi/constitution');
  const form = page.getByRole('form', { name: '中医体质量表' });
  await expect(form).toBeVisible();
  const context = page.getByRole('complementary', { name: '本次测评对照背景', exact: true });
  await expect(context.locator('.constitution-context-time time')).toHaveCount(1);
  await expect(context).toContainText('北京时间 UTC+08');
  await form.evaluate(element => element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  await expect(page.getByRole('alert')).toContainText('请先选择量表所用性别');
  await page.getByRole('radio', { name: '男', exact: true }).click();
  await expect(page.getByRole('radiogroup').getByRole('radio', { checked: true })).toHaveCount(0);
  await form.evaluate(element => element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  await expect(page.getByRole('alert')).toContainText('26 题未作答');
  expect(diagnostics.requests.filter(request => request.method === 'POST')).toHaveLength(0);
  await expect(page.locator('.panel-shell__actions').getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveCount(1);
  await page.keyboard.press('1');
  await expect(page.locator('.constitution-position')).toHaveText('2/26');
  await page.getByRole('button', { name: '结束并销毁答卷', exact: true }).click();
  await expect(page.getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveCount(0);
  await answerConstitution(page);
  expect(diagnostics.requests.filter(request => request.method === 'POST')).toHaveLength(0);
  const scoreResponsePromise = page.waitForResponse(response => response.url().endsWith('/constitution/assess'));
  await page.getByRole('button', { name: '查看结果', exact: true }).click();
  const scoreResponse = await scoreResponsePromise;
  expect(scoreResponse.status()).toBe(200);
  const { data } = await scoreResponse.json();
  const result = await expectConstitutionResults(page, data);
  const body = JSON.parse(diagnostics.requests.find(request => request.url.endsWith('/constitution/assess')).body);
  expect(body.sex).toBe('male');
  expect(body.questionnaireId).toBe('GBT46939-2025');
  expect(Object.keys(body.answers)).toHaveLength(26);
  await result.scrollIntoViewIfNeeded();
  await checkAccessibility(page, testInfo);
  await screenshot(page, testInfo, 'constitution-nine-dimensions');
  await page.locator('.panel-shell__actions').getByRole('button', { name: '返回修改', exact: true }).click();
  await expect(page.locator('.constitution-sex-summary')).toHaveText('男性版 · 更换');
  await changeConstitutionSex(page, '女', 26);
  await expect(result).toHaveCount(0);
  await expect(page.getByRole('img', { name: /已答 0 \/ 26/ })).toBeVisible();
  await expect(page.getByRole('radiogroup').getByRole('radio', { checked: true })).toHaveCount(0);
  await expect(page.locator('.panel-shell__actions').getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveCount(1);
  await page.keyboard.press('1');
  await expect(page.locator('.constitution-position')).toHaveText('2/26');
  await page.getByRole('button', { name: '结束并销毁答卷', exact: true }).click();
  await expect(page.getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: '女', exact: true })).not.toBeChecked();
  await expect(page.locator('.constitution-question-screen')).toHaveCount(0);
  expect(diagnostics.requests.filter(request => request.url.endsWith('/learning/current'))).toHaveLength(1);
});

for (const theme of ['light', 'dark']) {
  test(`constitution gender change: ${theme} inline confirmation, cancellation, Escape and empty answers`, async ({ page, diagnostics }, testInfo) => {
    await page.goto('/yunqi/constitution');
    if (theme === 'dark') await page.getByRole('button', { name: '切换至深色主题', exact: true }).click();
    const gender = page.getByRole('radiogroup', { name: '量表所用性别', exact: true });
    await expect(gender).toBeVisible();
    await expect(page.locator('input[type="date"], input[type="radio"]')).toHaveCount(0);
    await checkAccessibility(page, testInfo);
    await gender.getByRole('radio', { name: '男', exact: true }).click();
    await expect(gender).toHaveCount(0);
    await expect(page.locator('.constitution-sex-summary')).toHaveText('男性版 · 更换');
    await changeConstitutionSex(page, '女', 0);
    await expect(page.getByRole('button', { name: '确认', exact: true })).toHaveCount(0);
    await expect(page.locator('.constitution-sex-summary')).toHaveText('女性版 · 更换');
    await page.keyboard.press('3');
    await expect(page.locator('.constitution-position')).toHaveText('2/26');
    const change = page.getByRole('button', { name: '更换', exact: true });
    const confirmation = page.getByRole('group', { name: '更换将清空已作答的 1 题', exact: true });
    for (const method of ['button', 'Escape']) {
      await change.click();
      await expect(confirmation).toBeVisible();
      await expect(page.getByRole('button', { name: '取消', exact: true })).toBeFocused();
      await checkAccessibility(page, testInfo);
      await screenshot(page, testInfo, `constitution-gender-confirmation-${theme}-${method}`);
      if (method === 'button') await page.getByRole('button', { name: '取消', exact: true }).click();
      else await page.keyboard.press('Escape');
      await expect(confirmation).toHaveCount(0);
      await expect(change).toBeFocused();
      await expect(page.locator('.constitution-position')).toHaveText('2/26');
      await expect(page.getByRole('img', { name: /已答 1 \/ 26/ })).toBeVisible();
    }
    await page.getByRole('button', { name: '上一题', exact: true }).click();
    await expect(page.getByRole('radio', { name: '有时', exact: true })).toBeChecked();
    await change.click();
    await page.getByRole('button', { name: '确认', exact: true }).click();
    await expect(gender.getByRole('radio', { name: '男', exact: true })).toBeFocused();
    await expect(page.locator('.constitution-question-screen')).toHaveCount(0);
    await gender.getByRole('radio', { name: '男', exact: true }).click();
    await expect(page.locator('.constitution-position')).toHaveText('1/26');
    await expect(page.getByRole('img', { name: /已答 0 \/ 26/ })).toBeVisible();
    expect(diagnostics.requests.filter(request => request.url.endsWith('/constitution/assess'))).toHaveLength(0);
  });
}
