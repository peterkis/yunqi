import { expect, expectCompactTimes } from './fixtures.mjs';

export async function expandBirthInput(page) {
  await page.getByRole('button', { name: '修改', exact: true }).click();
  await expect(page.getByLabel('出生日期（公历）')).toBeFocused();
}

export async function expectBirthReadings(container, passages) {
  const cards = container.locator('.birth-reading');
  await expect(cards).toHaveCount(passages.length);
  for (const [index, passage] of passages.entries()) {
    const card = cards.nth(index);
    const full = card.locator('details');
    if (await full.count()) {
      await expect(full).not.toHaveAttribute('open');
      await full.locator('summary').focus();
      await full.locator('summary').press('Enter');
    }
    const quote = passage.quote.startsWith('“') && passage.quote.endsWith('”') ? passage.quote.slice(1, -1) : passage.quote;
    await expect(card.locator('blockquote').last()).toHaveText(`“${quote}”`);
    await expect(card.getByText('阅读释义', { exact: true })).toBeVisible();
    await expect(card.locator('.ds-quote-block__reading')).toHaveText(passage.explanation);
    await expect(card.locator('figcaption')).toHaveText(`《${passage.work}·${passage.chapter}》${passage.section}`);
    await expect(card.getByRole('link', { name: /查看原文出处/ })).toHaveAttribute('href', passage.sourceUrl);
    if (await full.count()) await full.locator('summary').press('Enter');
  }
}

export async function expectBirthComparison(page, data) {
  const result = page.getByRole('region', { name: '出生与当前运气对照结果', exact: true });
  await expect(result).toBeVisible();
  const single = !data.ambiguous && data.candidates.length === 1;
  if (single) await expect(result.locator('.birth-candidate-meta')).toHaveText(data.birthPrecision === 'date' ? '当日无交界 · 归属唯一' : '时刻已知 · 归属唯一');
  else await expect(result.locator('.birth-api-message')).toHaveText(data.message);
  await expect(result.locator('.birth-current-time')).toHaveCount(0);
  await expect(page.getByRole('group', { name: '出生资料摘要' })).toBeVisible();
  await expect(page.getByRole('form', { name: '出生运气输入' })).toHaveCount(0);
  const candidates = result.locator('.birth-candidate-card');
  await expect(candidates).toHaveCount(data.candidates.length);
  const names = ['岁运', '司天', '在泉', '所处气', '所处运'];
  const dimensions = ['中运对照', '司天对照', '在泉对照', '客气对照', '客运对照'];
  for (const [index, candidate] of data.candidates.entries()) {
    const article = candidates.nth(index);
    const table = article.getByRole('table');
    await expect(table.locator('.birth-table__time time')).toHaveAttribute('datetime', data.current.facts.input.localTime);
    await expect(table.getByRole('columnheader', { name: /先天 · 出生/ })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: /当下 · 今日/ })).toBeVisible();
    await expect(table.getByRole('rowheader')).toHaveText(names);
    await expect(table.locator('.birth-table__year strong')).toHaveText([candidate.learning.facts.stemBranch.ganzhi, data.current.facts.stemBranch.ganzhi]);
    await expect(table.locator('.birth-table__year > span')).toHaveText([String(candidate.learning.facts.year), String(data.current.facts.year)]);
    for (const [position, title] of dimensions.entries()) {
      const row = table.locator('tbody').nth(position);
      const relation = candidate.comparisons.find(item => item.title === title);
      expect(relation, `Real API supplies ${title}`).toBeDefined();
      await expect(row.locator('.ds-relation__chip')).toHaveText(relation.label);
      await expect(row.locator('.ds-relation__explanation')).toHaveText(relation.relation);
      const cells = row.locator('tr').first().locator('td');
      for (const [column, learning] of [candidate.learning, data.current].entries()) {
        const cell = cells.nth(column);
        if (position === 0) {
          await expect(cell).toContainText(`${learning.facts.suiYun.element}运${learning.facts.suiYun.state}`);
          await expect(cell).toContainText(learning.facts.suiYun.tone);
        }
        if (position === 1) await expect(cell).toContainText(learning.facts.sixQi.sitian);
        if (position === 2) await expect(cell).toContainText(learning.facts.sixQi.zaiquan);
        if (position === 3) {
          await expect(cell).toContainText(learning.facts.currentStep.name);
          await expect(cell).toContainText(`主气 ${learning.facts.currentStep.hostQi}`);
          await expect(cell).toContainText(`客气 ${learning.facts.currentStep.guestQi}`);
        }
        if (position === 4) {
          await expect(cell).toContainText(learning.currentMovement.name);
          await expect(cell).toContainText(`主运 ${learning.currentMovement.host.element}运${learning.currentMovement.host.state}`);
          await expect(cell).toContainText(`客运 ${learning.currentMovement.guest.element}运${learning.currentMovement.guest.state}`);
        }
      }
    }
    if (single) {
      await expect(article.locator('.birth-candidate-interval, .birth-candidate-time')).toHaveCount(0);
      const precision = result.locator('.birth-technical').getByRole('region', { name: `${candidate.label}精确时刻`, includeHidden: true });
      await expect(precision.locator('time').first()).toHaveAttribute('datetime', data.birthPrecision === 'date' ? candidate.from.localTime : candidate.learning.facts.input.localTime);
    } else if (data.birthPrecision === 'date') {
      const interval = article.locator('.birth-candidate-interval');
      await expect(interval).toContainText('起点包含，终点不包含');
      await expect(interval.locator('time')).toHaveCount(2);
      await expect(interval.locator('time').first()).toHaveAttribute('datetime', candidate.from.localTime);
      await expect(interval.locator('time').last()).toHaveAttribute('datetime', candidate.until.localTime);
      await expect(article.locator('.birth-candidate-time')).toHaveCount(0);
    } else {
      await expect(article.locator('.birth-candidate-time time')).toHaveAttribute('datetime', candidate.learning.facts.input.localTime);
      await expect(article.locator('.birth-candidate-interval')).toHaveCount(0);
    }
  }
  await expect(result.getByText('出生时令结构不等于体质，原文病候是文献线索而非发病预测。请与体质量表、四诊互参。', { exact: true })).toBeVisible();
  await expect(result.getByText('综合结论', { exact: true })).toHaveCount(0);
  await expect(result.locator('.birth-tables')).not.toContainText('→');
  await expectCompactTimes(page);
}
