import { test, expect, screenshot, expectTypeScale, scanAccessibility } from './fixtures.mjs';
import { fillBirthDate } from './birth-helpers.mjs';
import { answerConstitution, constitutionResultValues, expectConstitutionAnswerLayout, expectConstitutionResults, expectConstitutionResultLayout, expectConstitutionDisclosures, expectConstitutionSegments, expectConstitutionMixedReference, confirmConstitutionDestruction } from './constitution-helpers.mjs';
import { expectViewControls } from './visual-assertions.mjs';

// Fixed answer vectors for the versioned male questionnaire, sent through the
// real Service. Each run verifies its returned count; these are UI regressions,
// not expert scoring cases or independent clinical samples.
const profiles = [
  { count: 1, title: '痰湿质', values: constitutionResultValues },
  { count: 2, title: '偏颇质兼夹', values: [1, 3, 2, 4, 4, 4, 3, 5, 2, 1, 4, 3, 2, 2, 1, 3, 3, 2, 2, 2, 4, 1, 4, 2, 2, 2] },
  { count: 7, title: '偏颇质兼夹', values: [1, 2, 2, 3, 5, 4, 3, 2, 5, 5, 4, 2, 3, 5, 3, 1, 5, 3, 3, 4, 1, 4, 5, 4, 4, 3] },
];

test('constitution progress shows answered questions and keeps current dimensions in the grid', async ({ page }) => {
  await page.goto('/yunqi/constitution');
  await page.getByRole('radio', { name: '女', exact: true }).click();
  const heading = page.locator('.constitution-question-title');
  await expect(heading).toHaveText('您精力充沛吗？');
  await page.keyboard.press('1');
  await expect(heading).toHaveText('您容易疲乏吗？');
  await page.keyboard.press('2');
  await expect(heading).toHaveText('您感到闷闷不乐、情绪低沉吗？');
  const progress = page.locator('.constitution-dimensions');
  await expect(progress.getByRole('img', { name: '气虚质：1/3', exact: true })).toBeVisible();
  await expect(progress.getByRole('img', { name: '气郁质：0/3，当前题所属维度', exact: true })).toBeVisible();
  await page.keyboard.press('3');
  await expect(heading).toContainText('您比一般人耐受不了寒冷');
  await expect(progress.getByRole('img', { name: '平和质：3/4，当前题所属维度', exact: true })).toBeVisible();
  await expect(progress.getByRole('img', { name: '气郁质：1/3', exact: true })).toBeVisible();
  await expect(progress.getByRole('img', { name: '阳虚质：0/3，当前题所属维度', exact: true })).toBeVisible();
  await expect(progress.locator('.constitution-position')).toHaveText('已答 3 / 26');
  await expect(progress.locator('.constitution-progress-note')).toHaveCount(0);
  await expect(progress.locator('.constitution-position')).toHaveAccessibleName('已答 3 / 26 题，当前第 4 题');
  await page.getByRole('button', { name: '上一题', exact: true }).click();
  await expect(progress.locator('.constitution-position')).toHaveAccessibleName('已答 3 / 26 题，当前第 3 题');
  await expect(progress.locator('.constitution-position')).toHaveText('已答 3 / 26');
  await expect(progress.getByRole('img', { name: '阳虚质：0/3', exact: true })).toBeVisible();
});

for (const theme of ['light', 'dark']) {
  test(`constitution F4: ${theme} question announcement has no outline and Tab keeps option rings`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/yunqi/constitution');
    if (theme === 'dark') await page.getByRole('button', { name: '切换至深色主题', exact: true }).click();
    await page.getByRole('radio', { name: '男', exact: true }).click();
    const heading = page.locator('h3.constitution-question-title');
    await expect(heading).toBeFocused();
    await page.keyboard.press('2');
    await expect(page.locator('.constitution-position')).toHaveAttribute('aria-label', /当前第 2 题/);
    await expect(heading).toBeFocused();
    await expect(heading).toHaveCSS('outline-style', 'none');
    await expect(page.locator('.constitution-progress-grid > [data-current="true"] .constitution-dimension-name')).toHaveText(['平和', '气虚']);
    await page.getByRole('button', { name: '上一题', exact: true }).click();
    const selected = page.getByRole('radio', { name: '2 很少（有一点）', exact: true });
    await expect(selected).toBeChecked();
    const header = page.locator('.constitution-question-header');
    await expect(selected).toHaveCSS('background-color', await header.evaluate(element => getComputedStyle(element).backgroundColor));
    await expect(selected).toHaveCSS('color', await header.evaluate(element => getComputedStyle(element).color));
    await page.keyboard.press('Tab');
    await expect(selected).toBeFocused();
    await expect(selected).toHaveCSS('outline-style', 'solid');
    await expect(selected).toHaveCSS('outline-width', '2px');
    await expect(selected).toHaveCSS('outline-offset', '2px');
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: '3 有时（有些）', exact: true })).toBeFocused();
    await expect(selected).toBeChecked();
    await expect(page.locator('.constitution-position')).toHaveText('已答 1 / 26');
    await expectConstitutionAnswerLayout(page, testInfo);
    await expectConstitutionDisclosures(page, testInfo);
    await expectConstitutionSegments(page);
    const scan = await scanAccessibility(page);
    await testInfo.attach('constitution-F4-axe-results', { body: JSON.stringify(scan), contentType: 'application/json' });
    expect(scan.violations).toEqual([]);
  });
}

for (const embedded of [false, true]) {
  for (const profile of profiles) {
    test(`constitution shell actions: ${embedded ? 'birth' : 'standalone'}, ${profile.count} biased matches at minimum height`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 400, height: 640 });
      await page.goto(embedded ? '/yunqi/birth' : '/yunqi/constitution');
      const actions = page.locator('.panel-shell__actions');
      if (embedded) {
        const submit = actions.getByRole('button', { name: '查看对照', exact: true });
        await expect(submit).toHaveAttribute('form', await page.getByRole('form', { name: '出生运气输入' }).getAttribute('id'));
        await expect(actions).toBeInViewport({ ratio: 1 });
        await fillBirthDate(page, '1990-05-12');
        await submit.click();
        await actions.getByRole('button', { name: '同时测评体质', exact: true }).click();
      }
      await answerConstitution(page, page, { values: profile.values });
      if (profile.count === 7) await page.getByRole('button', { name: '切换至深色主题', exact: true }).click();
      await expectViewControls(page, testInfo);
      await expect(actions.getByRole('button', { name: '查看结果', exact: true })).toBeInViewport({ ratio: 1 });
      const responsePromise = page.waitForResponse(response => response.url().endsWith('/constitution/assess'));
      await actions.getByRole('button', { name: '查看结果', exact: true }).click();
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      const { data } = await response.json();
      expect(data.matchedTypes).toHaveLength(profile.count);
      expect(data.matchedTypes).not.toContain('balanced');
      const result = await expectConstitutionResults(page, data);
      if (profile.count === 1) expect(data.tendencyTypes).toEqual(['qi_stagnation', 'special_diathesis']);
      await expectConstitutionResultLayout(result, testInfo);
      await expectConstitutionDisclosures(page, testInfo, true);
      await expectConstitutionSegments(result);
      if (profile.count === 7) await expectConstitutionMixedReference(result, testInfo);
      await expect(result.locator('.constitution-decision h4')).toHaveText(profile.title);
      await expect(actions.getByRole('button')).toHaveText(['‹ 返回修改', '结束并销毁答卷']);
      await expectViewControls(page, testInfo);
      await expectTypeScale(page, testInfo);
      const scan = await scanAccessibility(page);
      await testInfo.attach('constitution-F5-axe-results', { body: JSON.stringify(scan), contentType: 'application/json' });
      expect(scan.violations).toEqual([]);
      await screenshot(page, testInfo, `${embedded ? 'birth' : 'standalone'}-${profile.count}-matches-result`);
      const bounds = await actions.boundingBox();
      await page.getByRole('main').evaluate(content => { content.scrollTop = content.scrollHeight; });
      await expect(actions).toBeInViewport({ ratio: 1 });
      expect(await actions.boundingBox()).toEqual(bounds);
      expect(await actions.evaluate(element => element.previousElementSibling.matches('.panel-shell__content') && element.nextElementSibling.matches('.panel-shell__footer'))).toBe(true);
      const lastContentTarget = embedded ? page.locator('.constitution-context-details > summary') : page.getByText('计算说明与版本', { exact: true });
      await lastContentTarget.focus();
      await page.keyboard.press('Tab');
      await expect(actions.getByRole('button', { name: '返回修改', exact: true })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(actions.getByRole('button', { name: '结束并销毁答卷', exact: true })).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(actions.getByRole('button', { name: '返回修改', exact: true })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(result).toHaveCount(0);
      await expect(page.locator('.constitution-answer-form > .constitution-context')).toBeVisible();
      await expect(page.locator('.constitution-question-title')).toBeFocused();
      await expect(page.locator('.constitution-sex-summary')).toHaveText('体质维度 · 男性版更换');
      await expect(page.locator('.constitution-position')).toHaveText('已答 26 / 26');
      await screenshot(page, testInfo, `${embedded ? 'birth' : 'standalone'}-${profile.count}-matches-edit`);
      await actions.getByRole('button', { name: '结束并销毁答卷', exact: true }).click();
      await confirmConstitutionDestruction(page);
      if (embedded) await expect(actions.getByRole('button', { name: '同时测评体质', exact: true })).toBeFocused();
      else await expect(page.getByRole('radio', { name: '男', exact: true })).toBeFocused();
    });
  }
}
