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

export async function answerConstitution(page, scope = page, { sex = '男', value = 1 } = {}) {
  await expect(scope.getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveCount(0);
  await scope.getByRole('radio', { name: sex, exact: true }).click();
  await expect(scope.getByRole('radiogroup', { name: '量表所用性别', exact: true })).toHaveCount(0);
  await expect(scope.locator('input[type="date"], input[type="radio"]')).toHaveCount(0);
  for (let number = 1; number <= 26; number += 1) {
    await expect(scope.locator('.constitution-position')).toHaveText(`${number}/26`);
    await expect(scope.locator('.constitution-question-screen')).toHaveCount(1);
    await expect(scope.getByRole('radiogroup')).toHaveCount(1);
    await expect(scope.getByRole('radiogroup').getByRole('radio')).toHaveCount(5);
    await expect(scope.getByRole('radiogroup').getByRole('radio', { checked: true })).toHaveCount(0);
    await expect(scope.getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveCount(number === 1 ? 0 : 1);
    await page.keyboard.press(String(value));
  }
  await expect(scope.getByRole('heading', { name: '26 题已全部作答', exact: true })).toBeFocused();
  await expect(scope.getByRole('button', { name: '查看结果', exact: true })).toBeVisible();
  await expect(scope.locator('.constitution-question-screen')).toHaveCount(0);
  await expect(scope.getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveCount(1);
  await expect(scope.getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveClass(/ds-button--secondary/);
}

export async function expectConstitutionResults(scope, assessment) {
  const result = scope.getByRole('region', { name: '体质测评结果', exact: true });
  await expect(result).toBeVisible();
  await expect(scope.getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveCount(1);
  await expect(scope.getByRole('button', { name: '结束并销毁答卷', exact: true })).toHaveClass(/ds-button--secondary/);
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
