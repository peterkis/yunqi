import { expect } from './fixtures.mjs';
import { expectTextContrast } from './visual-assertions.mjs';

// Fixed male answer vector verified against the real Service: one match and
// two tendencies. A presentation regression fixture, not an expert case.
export const constitutionResultValues = [3, 3, 1, 1, 2, 1, 1, 1, 2, 3, 1, 3, 2, 4, 1, 1, 4, 3, 2, 1, 5, 1, 5, 2, 1, 2];

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
  const edit = actions.getByRole('button', { name: '返回修改', exact: true });
  await expect(actions.getByRole('button')).toHaveText(['‹ 返回修改', '结束并销毁答卷']);
  await expect(edit).toHaveClass(/ds-button--text/);
  await expect(edit).toHaveAccessibleName('返回修改');
  await expect(edit.locator('[aria-hidden="true"]')).toHaveText('‹');
  await expect.poll(async () => {
    const [back, end] = await Promise.all([edit.boundingBox(), actions.getByRole('button', { name: '结束并销毁答卷', exact: true }).boundingBox()]);
    return back && end ? back.x + back.width <= end.x : false;
  }).toBe(true);
  await expect(page.locator('.panel-shell__drilldown').getByRole('heading', { name: '体质测评结果', exact: true })).toBeVisible();
  await expect(page.locator('.constitution-sex-summary')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '更换', exact: true })).toHaveCount(0);
  await expect(scope.locator('.constitution-answer-form > .constitution-context')).toBeHidden();
  const sexLabel = assessment.sex === 'male' ? '男性版' : '女性版';
  await expect(result.locator('.constitution-source .constitution-meta')).toHaveText(`${sexLabel} · ${assessment.questionnaireId} · ${assessment.version}`);
  await expect(result.locator('.constitution-result-navigation')).toHaveCount(0);
  await expectConstitutionTitle(result, assessment);
  await expect(result.getByRole('img')).toHaveCount(9);
  await expect(result.locator('.constitution-bar')).toHaveCount(9);
  await expect(result.locator('.constitution-bar-label')).toHaveText(assessment.results.map(dimension => dimension.name.replace(/质$/, '')));
  for (const [index, dimension] of assessment.results.entries()) {
    const row = result.locator('.constitution-bar').nth(index);
    await expect(row).toHaveAttribute('data-tone', dimension.status === 'yes' ? 'primary' : dimension.status === 'tendency' ? 'secondary' : 'neutral');
    await expect(row.locator('.constitution-bar-score')).toHaveText(dimension.score.toFixed(1));
    await expect(row.locator('.constitution-bar-score')).toHaveCSS('font-variant-numeric', 'tabular-nums');
    await expect(row.getByRole('img')).toHaveAttribute('aria-label', `${dimension.name}，转化分 ${dimension.score.toFixed(1)} 分（满分100），判定${dimension.label}；参考刻度30与40；原始分${dimension.rawScore}，${dimension.itemCount}个条目。`);
    await expect(row.locator('.constitution-bar-fill')).toHaveAttribute('style', `--constitution-fill: ${dimension.score}%;`);
    await expect(row.locator('.constitution-bar-tick')).toHaveCount(2);
  }
  const reference = result.getByRole('region', { name: '与运气互参', exact: true });
  await expect(reference.locator('dt')).toHaveText(['体质', '先天', '当下']);
  const shortName = id => assessment.results.find(dimension => dimension.id === id).name.replace(/质$/, '');
  const summary = [
    assessment.matchedTypes.length >= 3 ? `偏颇质兼夹 · ${assessment.matchedTypes.length} 项` : assessment.matchedTypes.map(shortName).join('、'),
    assessment.tendencyTypes.length ? `倾向 · ${assessment.tendencyTypes.length > 2 ? `${assessment.tendencyTypes.length} 项` : assessment.tendencyTypes.map(shortName).join('、')}` : '',
  ].filter(Boolean).join('\n');
  await expect(reference.locator('dd').first()).toHaveText(summary || await result.locator('.constitution-decision h4').textContent());
  const fullName = id => assessment.results.find(dimension => dimension.id === id).name;
  await expect(reference.locator('dd').first()).toHaveAttribute('aria-label', [
    assessment.matchedTypes.length ? `是：${assessment.matchedTypes.map(fullName).join('、')}` : await result.locator('.constitution-decision h4').textContent(),
    assessment.tendencyTypes.length ? `倾向：${assessment.tendencyTypes.map(fullName).join('、')}` : '',
  ].filter(Boolean).join('；'));
  await expect(reference.locator(':scope > :last-child')).toHaveClass('constitution-meta');
  await expect(reference.locator(':scope > :last-child')).toHaveText('体质、先天、当下三者并列供医师综合判断，系统不自动辨证、不给方药。');
  return result;
}

/** F6 disclosure order and geometry, in both standalone and birth sessions. */
export async function expectConstitutionDisclosures(scope, testInfo, result = false) {
  const notes = scope.locator('.constitution-notes');
  await expect(notes).toHaveCount(1);
  const summaries = notes.locator(':scope > details > summary');
  const hasBirthDetails = await notes.locator('.constitution-context-details').count();
  await expect(summaries).toHaveText([
    ...(result ? ['判定说明与边界'] : []), '量表来源与适用说明', '计算说明与版本',
    ...(hasBirthDetails ? ['本次对照快照与候选区间'] : []),
  ]);
  await expect(scope.locator('summary').filter({ hasText: /^本次量表版本$/ })).toHaveCount(0);
  await expect.poll(async () => {
    const boxes = await summaries.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON()));
    return boxes.every((box, index) => box.height >= 32 && Math.abs(box.x - boxes[0].x) <= 1 &&
      (index === 0 || box.y >= boxes[index - 1].y + boxes[index - 1].height - 1));
  }, { message: 'Disclosure summaries share a left edge and occupy distinct vertical rows' }).toBe(true);
  if (testInfo) await testInfo.attach('constitution-disclosure-layout', {
    body: JSON.stringify(await summaries.evaluateAll(elements => elements.map(element => ({ label: element.textContent, ...element.getBoundingClientRect().toJSON() })))),
    contentType: 'application/json',
  });
}

/** Inspect text ranges too: an inline-block alone always reports one box. */
export async function expectConstitutionSegments(scope) {
  const segments = scope.locator('.constitution-context-rows > div:first-child .ds-seg, .constitution-reference-rows > div:last-child .ds-seg');
  await expect(segments.first()).toBeVisible();
  await expect.poll(async () => segments.evaluateAll(elements => elements.every(element => {
    const range = document.createRange();
    range.selectNodeContents(element.querySelector('.ds-seg__text'));
    const lines = new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.top)));
    return element.getClientRects().length === 1 && lines.size === 1 && element.scrollWidth <= element.clientWidth + 1;
  })), { message: 'Current qi phrases remain whole at the 400px panel width' }).toBe(true);
}

export async function expectConstitutionMixedReference(result, testInfo) {
  const reference = result.locator('.constitution-reference-rows');
  await expect(reference.locator('dd').first()).toContainText('偏颇质兼夹 · 7 项');
  await expect.poll(async () => reference.evaluate(element => {
    const heights = [...element.children].map(cell => cell.getBoundingClientRect().height);
    const range = document.createRange();
    range.selectNodeContents(element.querySelector('dd'));
    const lines = new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.top))).size;
    return heights.length === 3 && Math.max(...heights) - Math.min(...heights) <= 1 && lines > 0 && lines <= 2;
  }), { message: 'Seven matches keep three equally high wells and at most two summary lines' }).toBe(true);
  if (testInfo) await testInfo.attach('constitution-seven-match-reference', {
    body: JSON.stringify(await reference.evaluate(element => ({
      cells: [...element.children].map(cell => cell.getBoundingClientRect().toJSON()),
      text: element.querySelector('dd').textContent, label: element.querySelector('dd').getAttribute('aria-label'),
    }))), contentType: 'application/json',
  });
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
  await expect(result.locator('.constitution-matched-types .ds-relation__chip:not(.ds-relation__chip--neutral)')).toHaveCount(0);
  const chips = result.locator('.constitution-tendency-types .ds-relation__chip');
  await expect(chips).toHaveText(assessment.tendencyTypes.map(id => `${name(id).replace(/质$/, '')} 倾向`));
  await expect(result.locator('.constitution-tendency-types .ds-relation__chip:not(.ds-relation__chip--favorable)')).toHaveCount(0);
  for (const chip of await chips.all()) await expect(chip).not.toContainText(/\d/);
  if (assessment.tendencyTypes.length) {
    const tendencies = result.locator('.constitution-decision-title > .constitution-tendency-types');
    await expect(tendencies).toHaveCount(1);
    // A wrapped group is centered as a whole; a single chip shares the title's
    // center exactly. Both stay in the title row, including mixed-type titles.
    await expect.poll(async () => {
      const title = await heading.boundingBox();
      const tags = await tendencies.boundingBox();
      expect(tags.x).toBeGreaterThanOrEqual(title.x + title.width);
      return Math.abs(title.y + title.height / 2 - tags.y - tags.height / 2);
    }).toBeLessThanOrEqual(2);
    const boxes = await Promise.all((await chips.all()).map(chip => chip.boundingBox()));
    if (boxes.every(box => Math.abs(box.y - boxes[0].y) <= 1)) {
      const title = await heading.boundingBox();
      for (const chip of boxes) expect(Math.abs(title.y + title.height / 2 - chip.y - chip.height / 2)).toBeLessThanOrEqual(2);
    }
  }
  await expect(result.getByText(assessment.summary, { exact: true })).toHaveCount(1);
  await expect(result.getByText(assessment.boundaryNote, { exact: true })).toHaveCount(1);
}

/** F5 geometry and token checks, reused after selecting each visual theme. */
export async function expectConstitutionResultLayout(result, testInfo) {
  await expect(result.locator(':scope > section')).toHaveCount(3);
  await expect(result.locator(':scope > section > .constitution-eyebrow, .constitution-chart-header > .constitution-eyebrow')).toHaveText(['判定', '九质转化分', '与运气互参']);
  await expect(result.locator('.constitution-decision > :last-child')).toHaveClass('constitution-meta num');
  const heading = result.locator('.constitution-decision h4');
  expect(await heading.evaluate(element => getComputedStyle(element).fontFamily)).toContain('Noto Serif SC');
  await expect(heading).toHaveCSS('font-size', '30px');
  await expect(heading).toHaveCSS('line-height', '33px');
  await expect(heading).toHaveCSS('font-weight', '700');
  const metrics = await result.evaluate(element => {
    const color = (target, token) => {
      const swatch = document.createElement('span');
      swatch.style.backgroundColor = `var(${token})`;
      target.append(swatch);
      const value = getComputedStyle(swatch).backgroundColor;
      swatch.remove();
      return value;
    };
    return {
      columns: getComputedStyle(element.querySelector('.constitution-reference-rows')).gridTemplateColumns.split(' ').map(Number.parseFloat),
      rows: [...element.querySelectorAll('.constitution-bar')].map(row => {
        const track = row.querySelector('.constitution-bar-track');
        const bounds = track.getBoundingClientRect();
        return {
          columns: getComputedStyle(row).gridTemplateColumns.split(' ').map(Number.parseFloat),
          height: row.getBoundingClientRect().height, trackHeight: bounds.height,
          fill: getComputedStyle(row.querySelector('.constitution-bar-fill')).backgroundColor,
          expectedFill: color(row, `--data-${row.dataset.tone}`),
          ticks: [...track.querySelectorAll('.constitution-bar-tick')].map(tick => ({
            ratio: (tick.getBoundingClientRect().left - bounds.left) / bounds.width,
            height: tick.getBoundingClientRect().height,
          })),
        };
      }),
    };
  });
  expect(metrics.columns).toHaveLength(3);
  for (const width of metrics.columns) expect(Math.abs(width - metrics.columns[0])).toBeLessThanOrEqual(1);
  expect(metrics.rows).toHaveLength(9);
  for (const row of metrics.rows) {
    expect(row.columns[0]).toBe(52);
    expect(row.columns[2]).toBe(36);
    expect(row.height).toBe(24);
    expect(row.trackHeight).toBe(8);
    expect(row.fill).toBe(row.expectedFill);
    expect(row.ticks).toHaveLength(2);
    row.ticks.forEach((tick, index) => {
      expect(tick.ratio).toBeCloseTo(index === 0 ? 0.3 : 0.4, 2);
      expect(tick.height).toBe(14);
    });
  }
  for (const chip of await result.locator('.constitution-tendency-types .ds-relation__chip').all()) await expectTextContrast(chip);
  if (testInfo) await testInfo.attach('constitution-result-layout', { body: JSON.stringify(metrics), contentType: 'application/json' });
}
