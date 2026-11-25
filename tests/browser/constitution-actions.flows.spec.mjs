import { test, expect, screenshot, expectTypeScale, scanAccessibility, waitForAnimations } from './fixtures.mjs';
import { fillBirthDate } from './birth-helpers.mjs';
import { answerConstitution, constitutionResultValues, expectConstitutionAnswerLayout, expectConstitutionResults, expectConstitutionResultLayout, expectConstitutionDisclosures, expectConstitutionSegments, expectConstitutionMixedReference, confirmConstitutionDestruction, expectSnapshotInkAlignment } from './constitution-helpers.mjs';
import { expectViewControls } from './visual-assertions.mjs';

// Fixed answer vectors for the versioned male questionnaire, sent through the
// real Service. Each run verifies its returned count; these are UI regressions,
// not expert scoring cases or independent clinical samples.
const profiles = [
  { count: 1, title: '痰湿质', values: constitutionResultValues },
  { count: 2, title: '偏颇质兼夹', values: [1, 3, 2, 4, 4, 4, 3, 5, 2, 1, 4, 3, 2, 2, 1, 3, 3, 2, 2, 2, 4, 1, 4, 2, 2, 2] },
  { count: 6, title: '偏颇质兼夹', values: [4, 4, 2, 4, 4, 5, 4, 5, 4, 4, 4, 3, 3, 4, 2, 3, 3, 3, 4, 4, 2, 3, 2, 2, 2, 2] },
  { count: 7, title: '偏颇质兼夹', values: [1, 2, 2, 3, 5, 4, 3, 2, 5, 5, 4, 2, 3, 5, 3, 1, 5, 3, 3, 4, 1, 4, 5, 4, 4, 3] },
];

test('five scored matches highlight both leaders and show the two Dahan candidates in separate lines', async ({ page }, testInfo) => {
  await page.goto('/yunqi/birth');
  await page.getByRole('radio', { name: '按出生年份' }).click();
  await page.getByRole('textbox', { name: '年', exact: true }).fill('1987');
  await page.getByRole('button', { name: '仅按年份对照' }).click();
  await page.getByRole('button', { name: '同时测评体质' }).click();
  const values = [4, 4, 3, 3, 4, 4, 3, 4, 1, 2, 2, 4, 4, 4, 3, 3, 3, 2, 2, 2, 4, 4, 2, 2, 2, 2];
  const request = await answerConstitution(page, page, { values });
  const { data } = await (await request.response()).json();
  const result = await expectConstitutionResults(page, data);
  await expect(result.locator('.constitution-match-count')).toHaveText('5 项达标');
  await expect(result.locator('[data-leading="true"] .constitution-match-chip')).toHaveText(['气虚质 75', '痰湿质 75']);
  await expect(result.locator('[data-leading="false"] .constitution-match-chip')).toHaveText(['气郁质 67', '阳虚质 58', '湿热质 50']);
  const reference = result.locator('.constitution-reference-rows');
  await expect(reference.locator('.constitution-dahan-badge')).toHaveText('大寒交界');
  await expect(reference.locator('.constitution-candidate-prefix')).toHaveText(['交节前', '交节起']);
  await expect(reference.locator('.constitution-context-candidate .ds-element')).toHaveText(['丙寅 · 水运太过', '丁卯 · 木运不及']);
  const standards = result.getByRole('button', { name: '判定标准' });
  await standards.press('Enter');
  await expect(result.locator('.constitution-standards')).toBeVisible();
  await standards.press('Space');
  await expect(result.locator('.constitution-standards')).toBeHidden();
  for (const width of [400, 320]) {
    await page.setViewportSize({ width, height: 640 });
    if (width === 320) await page.getByRole('button', { name: '切换至深色主题' }).click();
    await expectConstitutionResultLayout(result, testInfo);
    const lines = await reference.locator('.constitution-context-candidate').evaluateAll(items => items.map(item => {
      const prefix = item.firstElementChild.getBoundingClientRect();
      const value = item.lastElementChild.getBoundingClientRect();
      return { top: prefix.top, bottom: prefix.bottom, valueTop: value.top, overflow: item.scrollWidth - item.clientWidth };
    }));
    expect(lines[0].bottom).toBeLessThanOrEqual(lines[1].top);
    for (const line of lines) {
      expect(Math.abs(line.top - line.valueTop)).toBeLessThanOrEqual(3);
      expect(line.overflow).toBeLessThanOrEqual(1);
    }
    const snapshots = result.getByText('本次对照快照与候选区间', { exact: true });
    await snapshots.click();
    const shadowMargin = await snapshots.evaluate(summary => {
      const content = getComputedStyle(summary.closest('details'), '::details-content');
      return content.overflowX === 'clip' ? parseFloat(content.overflowClipMargin) : null;
    });
    if (shadowMargin !== null) expect(shadowMargin).toBeGreaterThanOrEqual(16);
    const intervals = result.locator('.constitution-birth-candidate footer');
    await expect(intervals).toHaveCount(2);
    const footers = await intervals.all();
    const [before, after] = await Promise.all(footers.map(footer => footer.locator('time').allTextContents()));
    expect(before[0]).toBe('1987-01-01 00:00');
    expect(after[0]).toBe(before[1]);
    expect(after[1]).toBe('1988-01-01 00:00');
    for (const footer of footers) {
      await expect(footer.getByText('可能区间', { exact: true })).toBeVisible();
      const sameLine = await footer.evaluate(node => {
        const label = node.firstElementChild.getBoundingClientRect();
        const [start, end] = [...node.querySelectorAll('time')].map(time => time.getBoundingClientRect());
        return label.right < start.left && label.top < start.bottom && label.bottom > start.top &&
          Math.abs(start.y - end.y) <= 1 && end.right <= node.getBoundingClientRect().right + 1;
      });
      expect(sameLine).toBe(true);
      await expectSnapshotInkAlignment(footer.locator('..'));
    }
    await snapshots.click();
    expect((await scanAccessibility(page)).violations).toEqual([]);
  }
});

test('constitution progress shows answered questions and keeps current dimensions in the grid', async ({ page }) => {
  await page.goto('/yunqi/constitution');
  await page.getByRole('radio', { name: '女性量表', exact: true }).click();
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

for (const [width, theme] of [[400, 'light'], [320, 'dark']]) {
  test(`constitution destroy confirmation stays in its 44px row at ${width}px in ${theme} mode`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 640 });
    await page.goto('/yunqi/constitution');
    if (theme === 'dark') await page.getByRole('button', { name: '切换至深色主题' }).click();
    await page.getByRole('radio', { name: '男性量表', exact: true }).click();
    await page.keyboard.press('2');
    const progress = page.locator('.constitution-position');
    await expect(progress).toHaveAttribute('aria-label', /当前第 2 题/);
    const bar = page.locator('.constitution-answer-form .constitution-actions');
    const trigger = bar.getByRole('button', { name: '结束并销毁', exact: true });
    await expect(bar.getByRole('button')).toHaveText(['上一题', '结束并销毁']);
    await expect(page.locator('.panel-shell__actions')).toHaveCount(0);
    await waitForAnimations(page);
    await trigger.scrollIntoViewIfNeeded();
    const geometry = () => bar.evaluate(el => {
      const form = el.closest('form');
      const box = node => { const { x, y, width, height } = node.getBoundingClientRect(); return { x, y, width, height }; };
      return { bar: box(el), options: box(form.querySelector('[role="radiogroup"]')), notes: box(form.parentElement.querySelector('.constitution-notes')) };
    });
    const before = await geometry();
    expect(before.bar.height).toBe(44);
    const lastButton = await trigger.boundingBox();
    expect(lastButton.x + lastButton.width).toBeCloseTo(before.bar.x + before.bar.width, 0);
    await screenshot(page, testInfo, 'answer-actions');
    await trigger.click();
    const cancel = bar.getByRole('button', { name: '取消', exact: true });
    await expect(cancel).toBeFocused();
    expect(await geometry()).toEqual(before);
    const confirm = bar.getByRole('button', { name: '确认销毁', exact: true });
    await expect(confirm).toBeInViewport({ ratio: 1 });
    expect(await bar.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await screenshot(page, testInfo, 'confirm-destroy');
    await page.keyboard.press('5');
    await expect(progress).toHaveText('已答 1 / 26');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    expect(await geometry()).toEqual(before);
    await trigger.press('Enter');
    await cancel.click();
    await expect(trigger).toBeFocused();
    await trigger.click();
    const source = page.locator('.constitution-source > summary');
    await source.click();
    await expect(cancel).toHaveCount(0);
    await expect(source).toBeFocused();
    await expect(page.locator('.constitution-source')).toHaveAttribute('open', '');
    await expect(progress).toHaveText('已答 1 / 26');
    await trigger.click();
    const option = page.getByRole('radio', { name: '3 有时（有些）', exact: true });
    await option.click();
    await expect(cancel).toHaveCount(0);
    await expect(progress).toHaveAttribute('aria-label', '已答 2 / 26 题，当前第 3 题');
    await bar.getByRole('button', { name: '上一题' }).click();
    await expect(option).toBeChecked();
    await trigger.press('Enter');
    await page.keyboard.press('Tab');
    await expect(confirm).toBeFocused();
    await confirm.press('Enter');
    await expect(page.getByRole('radio', { name: '男性量表', exact: true })).toBeFocused();
  });
}

for (const theme of ['light', 'dark']) {
  test(`constitution F4: ${theme} question announcement has no outline and Tab keeps option rings`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/yunqi/constitution');
    if (theme === 'dark') await page.getByRole('button', { name: '切换至深色主题', exact: true }).click();
    await page.getByRole('radio', { name: '男性量表', exact: true }).click();
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
        await fillBirthDate(page, '1990-05-12');
        const submit = page.getByRole('form', { name: '出生运气输入' }).getByRole('button', { name: '确认并对照', exact: true });
        await expect(submit).toBeInViewport({ ratio: 1 });
        await submit.click();
        await actions.getByRole('button', { name: '同时测评体质', exact: true }).click();
      }
      const request = await answerConstitution(page, page, { values: profile.values });
      if (profile.count === 7) await page.getByRole('button', { name: '切换至深色主题', exact: true }).click();
      await expectViewControls(page, testInfo);
      const response = await request.response();
      expect(response.status()).toBe(200);
      const { data } = await response.json();
      expect(data.matchedTypes).toHaveLength(profile.count);
      expect(data.matchedTypes).not.toContain('balanced');
      const narrowTendency = embedded && profile.count === 6;
      if (narrowTendency) await page.setViewportSize({ width: 320, height: 640 });
      const result = await expectConstitutionResults(page, data);
      if (narrowTendency) {
        const count = await result.locator('.constitution-match-count').boundingBox();
        const tag = await result.getByText('气郁 倾向', { exact: true }).boundingBox();
        expect(tag.y).toBeGreaterThanOrEqual(count.y + count.height);
        expect(Math.abs(tag.x + tag.width - count.x - count.width)).toBeLessThanOrEqual(1);
      }
      if (profile.count === 1) expect(data.tendencyTypes).toEqual(['qi_stagnation', 'special_diathesis']);
      await expectConstitutionResultLayout(result, testInfo);
      await expectConstitutionDisclosures(page, testInfo, true);
      await expectConstitutionSegments(result);
      if (profile.count === 7) await expectConstitutionMixedReference(result, testInfo);
      await expect(result.locator('.constitution-decision h4')).toHaveText(profile.title);
      await expect(actions.getByRole('button')).toHaveText(['‹ 返回修改', '结束并销毁']);
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
      await result.getByText('本次对照快照与候选区间', { exact: true }).focus();
      await page.keyboard.press('Tab');
      await expect(actions.getByRole('button', { name: '返回修改', exact: true })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(actions.getByRole('button', { name: '结束并销毁', exact: true })).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(actions.getByRole('button', { name: '返回修改', exact: true })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(result).toHaveCount(0);
      await expect(page.locator('.constitution-answer-form > .constitution-context')).toBeVisible();
      await expect(page.locator('.constitution-question-title')).toBeFocused();
      await expect(page.locator('.constitution-sex-summary')).toHaveText('体质维度 · 男性版更换');
      await expect(page.locator('.constitution-position')).toHaveText('已答 26 / 26');
      await screenshot(page, testInfo, `${embedded ? 'birth' : 'standalone'}-${profile.count}-matches-edit`);
      await page.locator('.constitution-answer-form .constitution-actions').getByRole('button', { name: '结束并销毁', exact: true }).click();
      await confirmConstitutionDestruction(page);
      await expect(page).toHaveURL(/\/yunqi\/constitution(?:\?motion=off)?$/);
      await expect(page.getByRole('radio', { name: '男性量表', exact: true })).toBeFocused();
    });
  }
}
