import { expect } from './fixtures.mjs';
import { expectTextContrast } from './visual-assertions.mjs';

export async function expectConstitutionAnswerLayout(scope, testInfo) {
  const context = scope.locator('.constitution-context');
  await expect(context.locator('.constitution-context-rows > div')).toHaveCount(2);
  await expect(context.locator('.constitution-dimensions')).toHaveCount(1);
  await expect(context.locator('.constitution-time-details')).toHaveCount(0);
  const grid = context.getByRole('list', { name: '九种体质作答进度', exact: true });
  await expect(grid.getByRole('listitem')).toHaveCount(9);
  await expect(grid.locator('.constitution-dimension-name')).toHaveText(['平和', '气虚', '阳虚', '阴虚', '痰湿', '湿热', '血瘀', '气郁', '特禀']);
  const geometry = await grid.evaluate(element => ({
    columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
    rows: getComputedStyle(element).gridTemplateRows.split(' ').length,
    tracks: [...element.querySelectorAll('.constitution-dimension-track')].map(track => track.getBoundingClientRect().height),
  }));
  expect(geometry).toEqual({ columns: 9, rows: 1, tracks: Array(9).fill(3) });
  const header = scope.locator('.constitution-question-header');
  await expect(header.locator(':scope > *')).toHaveCount(2);
  await expect(header.locator('h3.constitution-question-title')).toHaveAttribute('tabindex', '-1');
  await expect(header.locator('p')).toHaveText('请患者根据近一年的体验和感觉作答 · 数字键 1–5');
  await expect(header).not.toContainText(/体质量表|男性版|女性版|\d+\s*\/\s*26/);
  const contrast = await expectTextContrast(header);
  const accentColor = await header.evaluate(element => getComputedStyle(element).backgroundColor);
  const headerColor = await header.evaluate(element => getComputedStyle(element).color);
  await expect(header.locator('h3')).toHaveCSS('color', headerColor);
  await expect(header.locator('p')).toHaveCSS('color', headerColor);
  await expect(header.locator('p')).toHaveCSS('opacity', '0.85');
  for (const name of await grid.locator('[data-current="true"] .constitution-dimension-name').all()) {
    await expect(name).toHaveCSS('color', accentColor);
    await expect(name).toHaveCSS('font-weight', '700');
  }
  for (const name of await grid.locator('[data-answered="true"] .constitution-dimension-name').all()) await expect(name).toHaveCSS('color', accentColor);
  const options = scope.locator('.constitution-question-screen .ds-scale-option');
  const labels = ['没有（根本不）', '很少（有一点）', '有时（有些）', '经常（相当）', '总是（非常）'];
  for (let value = 1; value <= 5; value += 1) {
    const option = options.nth(value - 1);
    await expect(option).toHaveAccessibleName(`${value} ${labels[value - 1]}`);
    await expect(option).toHaveCSS('height', '48px');
    await expect(option.locator('.ds-scale-option__key')).toHaveCSS('width', '22px');
    await expect(option.locator('.ds-scale-option__key')).toHaveCSS('height', '22px');
    const degree = option.locator('.ds-scale-option__degree');
    await expect(degree).toHaveAttribute('aria-hidden', 'true');
    await expect(degree.locator(':scope > span')).toHaveCount(5);
    await expect(degree.locator('[data-filled="true"]')).toHaveCount(value);
    for (const dot of await degree.locator(':scope > span').all()) {
      await expect(dot).toHaveCSS('width', '7px');
      await expect(dot).toHaveCSS('height', '7px');
    }
  }
  if (testInfo) await testInfo.attach('constitution-answer-layout', { body: JSON.stringify({ ...geometry, headerContrast: contrast }), contentType: 'application/json' });
}

export async function changeConstitutionSex(scope, sex, answered) {
  await scope.getByRole('button', { name: '更换', exact: true }).click();
  if (answered > 0) {
    await expect(scope.getByRole('group', { name: `更换将清空已作答的 ${answered} 题`, exact: true })).toBeVisible();
    await scope.getByRole('button', { name: '确认', exact: true }).click();
  }
  await expect(scope.getByRole('radio', { name: '男', exact: true })).toBeFocused();
  await scope.getByRole('radio', { name: sex, exact: true }).click();
}

export async function answerConstitution(page, scope = page, { sex = '男', value = 1, values } = {}) {
  const actions = page.locator('.panel-shell__actions');
  await expect(actions.getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveCount(0);
  await scope.getByRole('radio', { name: sex, exact: true }).click();
  await expect(scope.getByRole('radiogroup', { name: '量表所用性别', exact: true })).toHaveCount(0);
  await expect(scope.locator('input[type="date"], input[type="radio"]')).toHaveCount(0);
  for (let number = 1; number <= 26; number += 1) {
    await expect(scope.locator('.constitution-position')).toHaveAttribute('aria-label', new RegExp(`当前第 ${number} 题`));
    await expect(scope.locator('.constitution-position')).toHaveText(`${number - 1} / 26`);
    await expect(scope.locator('.constitution-position.num')).toHaveCSS('font-variant-numeric', 'tabular-nums');
    await expect(scope.locator('.constitution-question-screen')).toHaveCount(1);
    await expect(scope.getByRole('radiogroup')).toHaveCount(1);
    await expect(scope.getByRole('radiogroup').getByRole('radio')).toHaveCount(5);
    await expect(scope.getByRole('radiogroup').getByRole('radio', { checked: true })).toHaveCount(0);
    await expect(actions.getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveCount(1);
    await page.keyboard.press(String(values ? values[number - 1] : value));
  }
  await expect(scope.getByRole('heading', { name: '26 题已全部作答', exact: true })).toBeFocused();
  const submit = actions.getByRole('button', { name: '查看结果', exact: true });
  await expect(submit).toBeVisible();
  await expect(submit).toHaveAttribute('form', await scope.getByRole('form', { name: '中医体质量表', exact: true }).getAttribute('id'));
  await expect(submit).toHaveClass(/ds-button--primary/);
  await expect(scope.locator('.constitution-question-screen')).toHaveCount(0);
  await expect(actions.getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveCount(1);
  await expect(actions.getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveClass(/ds-button--secondary/);
}

export async function expectConstitutionResults(page, assessment, scope = page) {
  const result = scope.getByRole('region', { name: '体质测评结果', exact: true });
  await expect(result).toBeVisible();
  const actions = page.locator('.panel-shell__actions');
  await expect(actions.getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveCount(1);
  await expect(actions.getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveClass(/ds-button--secondary/);
  await expect(actions.getByRole('button', { name: '返回修改', exact: true })).toHaveClass(/ds-button--text/);
  await expect(page.locator('.panel-shell__drilldown').getByRole('heading', { name: '体质测评结果', exact: true })).toBeVisible();
  await expect(page.locator('.constitution-sex-summary')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '更换', exact: true })).toHaveCount(0);
  const sexLabel = assessment.sex === 'male' ? '男性版' : '女性版';
  await expect(result.locator('.constitution-source .constitution-meta')).toHaveText(`${sexLabel} · ${assessment.questionnaireId} · ${assessment.version}`);
  await expect(result.locator('.constitution-result-navigation')).toHaveCount(0);
  await expectConstitutionTitle(result, assessment);
  await expect(result.getByRole('img')).toHaveCount(9);
  await expect(result.locator('.constitution-bar')).toHaveCount(9);
  for (const dimension of assessment.results) {
    const row = result.locator('.constitution-bar').filter({ hasText: dimension.name });
    await expect(row).toContainText(dimension.label);
    await expect(row).toContainText(`${dimension.score.toFixed(1)} 分`);
    await expect(row.locator('.constitution-bar-label > .num')).toHaveText(`${dimension.score.toFixed(1)} 分`);
    await expect(row.locator('.constitution-bar-label > .num')).toHaveCSS('font-variant-numeric', 'tabular-nums');
    await expect(row.getByRole('img')).toHaveAttribute('aria-label', `${dimension.name}，转化分 ${dimension.score.toFixed(1)} 分（满分100），判定${dimension.label}；参考刻度30与40；原始分${dimension.rawScore}，${dimension.itemCount}个条目。`);
    await expect(row.locator('.constitution-bar-fill')).toHaveAttribute('style', `--constitution-fill: ${dimension.score}%;`);
    await expect(row.locator('.constitution-bar-tick')).toHaveCount(2);
  }
  const reference = result.getByRole('region', { name: '与运气互参', exact: true });
  await expect(reference.locator('dt')).toHaveText(['体质', '先天', '当下']);
  await expect(reference).toContainText('三者并列呈现供医师综合判断，系统不自动辨证、不给方药。');
  return result;
}

export async function expectConstitutionTitle(result, assessment) {
  const name = id => assessment.results.find(dimension => dimension.id === id).name;
  const balanced = assessment.results.find(dimension => dimension.id === 'balanced');
  const title = balanced.status === 'yes' ? '平和质' : balanced.status === 'basically' ? '基本是平和质'
    : assessment.matchedTypes.length === 1 ? name(assessment.matchedTypes[0])
    : assessment.matchedTypes.length > 1 ? '偏颇质兼夹' : '未达明确类型';
  const heading = result.locator('.constitution-decision h4');
  await expect(heading).toHaveText(title);
  await heading.evaluate(() => document.fonts.ready);
  const metrics = await heading.evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return {
      rects: element.getClientRects().length, textRects: range.getClientRects().length,
      height: element.getBoundingClientRect().height, line: Number.parseFloat(getComputedStyle(element).lineHeight),
      font: getComputedStyle(element).fontSize, overflow: getComputedStyle(element).textOverflow,
      clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
    };
  });
  expect(metrics.rects).toBe(1);
  expect(metrics.textRects).toBe(1);
  expect(metrics.height).toBeLessThanOrEqual(metrics.line);
  expect(metrics.font).toBe('30px');
  expect(metrics.overflow).not.toBe('ellipsis');
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  const matched = result.locator('.constitution-matched-types .ds-relation__chip');
  const mixedTypes = assessment.matchedTypes.length >= 2 ? assessment.matchedTypes : [];
  await expect(result.locator('.constitution-matched-types')).toHaveCount(mixedTypes.length ? 1 : 0);
  await expect(matched).toHaveCount(mixedTypes.length);
  await expect(matched).toHaveText(mixedTypes.map(name));
  await expect(result.locator('.constitution-tendency-types .ds-relation__chip')).toHaveText(assessment.tendencyTypes.map(name));
  await expect(result.locator('.constitution-type-groups .ds-relation__chip:not(.ds-relation__chip--neutral)')).toHaveCount(0);
  await expect(result.getByText(assessment.summary, { exact: true })).toHaveCount(1);
  await expect(result.getByText(assessment.boundaryNote, { exact: true })).toHaveCount(1);
}
