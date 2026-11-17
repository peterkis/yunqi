import { expect } from './fixtures.mjs';

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
    await expect(scope.locator('.constitution-position')).toHaveText(`${number}/26`);
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
