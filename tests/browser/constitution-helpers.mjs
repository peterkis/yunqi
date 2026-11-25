import { expect, waitForAnimations } from './fixtures.mjs';
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
  await waitForAnimations(scope.page?.() ?? scope);
  const geometry = await grid.evaluate(element => ({
    columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
    rows: getComputedStyle(element).gridTemplateRows.split(' ').length,
    tracks: [...element.querySelectorAll('.constitution-dimension-track')].map(track => track.getBoundingClientRect().height),
  }));
  expect(geometry).toEqual({ columns: 9, rows: 1, tracks: Array(9).fill(3) });
  const header = scope.locator('.constitution-question-header');
  await expect(header.locator(':scope > *')).toHaveCount(2);
  await expect(header.locator('h3.constitution-question-title')).toHaveAttribute('tabindex', '-1');
  await expect(header.locator('p > span')).toHaveText(['请患者根据近一年的体验和感觉作答', '数字键 1–5 · ← 上一题']);
  const [instruction, shortcuts] = await header.locator('p > span').evaluateAll(spans => spans.map(span => {
    const range = document.createRange();
    range.selectNodeContents(span);
    return [...range.getClientRects()].map(rect => ({ top: rect.top, bottom: rect.bottom }));
  }));
  expect(shortcuts).toHaveLength(1);
  expect(shortcuts[0].top).toBeGreaterThanOrEqual(instruction.at(-1).bottom);
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
  for (const name of await grid.locator('[data-emphasized="true"] .constitution-dimension-name').all()) await expect(name).toHaveCSS('color', accentColor);
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
    await expect(scope.getByRole('alertdialog', { name: `更换将清空已作答的 ${answered} 题`, exact: true })).toBeVisible();
    await scope.getByRole('button', { name: '确认', exact: true }).click();
  }
  await expect(scope.getByRole('radio', { name: '男性量表', exact: true })).toBeFocused();
  await scope.getByRole('radio', { name: sex + '性量表', exact: true }).click();
}

export async function answerConstitution(page, scope = page, { sex = '男', value = 1, values, stopBeforeLast = false } = {}) {
  const actions = page.locator('.panel-shell__actions');
  // Role lookup excludes retained/aria-hidden visual copies, even if the
  // previous answer's 120ms destruction snapshot has not expired yet.
  const form = scope.getByRole('form', { name: '中医体质量表', exact: true });
  await expect(page.getByRole('button', { name: '结束并销毁', exact: true })).toHaveCount(0);
  await scope.getByRole('radio', { name: sex + '性量表', exact: true }).click();
  await expect(scope.getByRole('radiogroup', { name: '量表所用性别', exact: true })).toHaveCount(0);
  await expect(scope.locator('input[type="date"], input[type="radio"]')).toHaveCount(0);
  let scoreRequest;
  for (let number = 1; number <= 26; number += 1) {
    await expect(form.locator('.constitution-position')).toHaveAttribute('aria-label', new RegExp(`当前第 ${number} 题`));
    await expect(form.locator('.constitution-position')).toHaveText(`已答 ${number - 1} / 26`);
    await expect(form.locator('.constitution-position.num')).toHaveCSS('font-variant-numeric', 'tabular-nums');
    await expect(form.locator('.constitution-question-screen')).toHaveCount(1);
    await expect(scope.getByRole('radiogroup')).toHaveCount(1);
    await expect(scope.getByRole('radiogroup').getByRole('radio')).toHaveCount(5);
    await expect(scope.getByRole('radiogroup').getByRole('radio', { checked: true })).toHaveCount(0);
    await expect(form.locator('.constitution-actions').getByRole('button', { name: '结束并销毁', exact: true })).toHaveCount(1);
    if (number === 26) {
      if (stopBeforeLast) return;
      scoreRequest = page.waitForRequest(request => request.url().endsWith('/constitution/assess'));
    }
    await page.keyboard.press(String(values ? values[number - 1] : value));
  }
  const request = await scoreRequest;
  await expect(actions.getByRole('button', { name: '查看结果', exact: true })).toHaveCount(0);
  await expect(scope.locator('.constitution-question-screen')).toHaveCount(0);
  await expect(actions.getByRole('button', { name: '结束并销毁', exact: true })).toHaveCount(1);
  await expect(actions.getByRole('button', { name: '结束并销毁', exact: true })).toHaveClass(/ds-button--secondary/);
  return request;
}

export async function confirmConstitutionDestruction(page, keyboard = false) {
  const confirm = page.getByRole('button', { name: '确认销毁', exact: true });
  await expect(page.getByRole('group', { name: '销毁本次答卷与结果？', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '取消', exact: true })).toBeFocused();
  if (keyboard) {
    await page.keyboard.press('Tab');
    await expect(confirm).toBeFocused();
    await page.keyboard.press('Enter');
  } else await confirm.click();
  await expect(page.getByRole('radio', { name: '男性量表', exact: true })).toBeFocused();
  await expect(page.getByText('答卷已销毁', { exact: true })).toHaveCount(0);
}

export function rankedDimensions(assessment) {
  return [...assessment.results].sort((a, b) => b.score - a.score ||
    Number(b.status === 'yes' && b.id !== 'balanced') - Number(a.status === 'yes' && a.id !== 'balanced'));
}

export async function expectConstitutionResults(page, assessment, scope = page) {
  const result = scope.getByRole('region', { name: '体质测评结果', exact: true });
  await expect(result).toBeVisible();
  await waitForAnimations(page);
  const actions = page.locator('.panel-shell__actions');
  await expect(actions.getByRole('button', { name: '结束并销毁', exact: true })).toHaveCount(1);
  await expect(actions.getByRole('button', { name: '结束并销毁', exact: true })).toHaveClass(/ds-button--secondary/);
  const edit = actions.getByRole('button', { name: '返回修改', exact: true });
  await expect(actions.getByRole('button')).toHaveText(['‹ 返回修改', '结束并销毁']);
  await expect(edit).toHaveClass(/ds-button--text/);
  await expect(edit).toHaveAccessibleName('返回修改');
  await expect(edit.locator('[aria-hidden="true"]')).toHaveText('‹');
  await expect.poll(async () => {
    const [back, end] = await Promise.all([edit.boundingBox(), actions.getByRole('button', { name: '结束并销毁', exact: true }).boundingBox()]);
    return back && end ? back.x + back.width <= end.x : false;
  }).toBe(true);
  const title = page.locator('.panel-shell__drilldown').getByRole('heading', { name: '体质测评结果', exact: true });
  await expect(title).toBeVisible();
  const tabs = page.getByRole('navigation', { name: '工作台导航' });
  await expect(tabs.getByRole('link')).toHaveText(['当下运气', '先天对照', '体质量表']);
  await expect(tabs.getByRole('link', { name: '体质量表' })).toHaveAttribute('aria-current', 'page');
  await expect(tabs).toBeInViewport({ ratio: 1 });
  const [navBox, titleBox] = await Promise.all([tabs.boundingBox(), title.boundingBox()]);
  expect(navBox.y + navBox.height).toBeLessThanOrEqual(titleBox.y);
  await expect(page.locator('.constitution-sex-summary')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '更换', exact: true })).toHaveCount(0);
  await expect(scope.locator('.constitution-answer-form > .constitution-context')).toBeHidden();
  const sexLabel = assessment.sex === 'male' ? '男性版' : '女性版';
  await expect(result.locator('.constitution-source .constitution-meta')).toHaveText(`${sexLabel} · ${assessment.questionnaireId} · ${assessment.version}`);
  await expect(result.locator('.constitution-result-navigation')).toHaveCount(0);
  await expectConstitutionTitle(result, assessment);
  await expect(result.getByRole('img')).toHaveCount(9);
  await expect(result.locator('.constitution-bar')).toHaveCount(9);
  const ranked = rankedDimensions(assessment);
  await expect(result.locator('.constitution-bar-label')).toHaveText(ranked.map(dimension => dimension.name.replace(/质$/, '')));
  for (const [index, dimension] of ranked.entries()) {
    const row = result.locator('.constitution-bar').nth(index);
    await expect(row).toHaveAttribute('data-tone', dimension.status === 'yes' ? 'primary' : dimension.status === 'tendency' ? 'secondary' : 'neutral');
    await expect(row.locator('.constitution-bar-score')).toHaveText(dimension.score.toFixed(1));
    await expect(row.locator('.constitution-bar-score')).toHaveCSS('font-variant-numeric', 'tabular-nums');
    await expect(row.getByRole('img')).toHaveAttribute('aria-label', `${dimension.name}，转化分 ${dimension.score.toFixed(1)} 分（满分100），判定${dimension.label}；参考刻度30与40；原始分${dimension.rawScore}，${dimension.itemCount}个条目。`);
    await expect(row.locator('.constitution-bar-fill')).toHaveAttribute('style', `--constitution-fill: ${dimension.score}%;`);
  }
  await expect(result.locator('.constitution-chart-guide')).toHaveCount(2);
  const reference = result.getByRole('region', { name: '与运气互参', exact: true });
  await expect(reference.locator('dt')).toHaveText(['体质', /^先天(?:大寒交界)?$/, '当下']);
  const shortName = id => assessment.results.find(dimension => dimension.id === id).name.replace(/质$/, '');
  const matches = ranked.filter(type => assessment.matchedTypes.includes(type.id));
  const decision = await result.locator('.constitution-decision h4').textContent();
  const leaders = matches.filter(type => type.score === matches[0].score).map(type => shortName(type.id));
  const summary = [
    matches.length >= 2 ? `偏颇质兼夹 · ${matches.length} 项（主：${leaders.join('、')}）` : (matches.length ? shortName(matches[0].id) : decision),
    assessment.tendencyTypes.length ? `倾向 · ${assessment.tendencyTypes.length > 2 ? `${assessment.tendencyTypes.length} 项` : assessment.tendencyTypes.map(shortName).join('、')}` : '',
  ].filter(Boolean).join('\n');
  await expect(reference.locator('dd').first()).toHaveText(summary || await result.locator('.constitution-decision h4').textContent());
  const fullName = id => assessment.results.find(dimension => dimension.id === id).name;
  await expect(reference.locator('dd').first()).toHaveAttribute('aria-label', [
    assessment.matchedTypes.length ? `是：${matches.map(type => fullName(type.id)).join('、')}` : await result.locator('.constitution-decision h4').textContent(),
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
    ...(result ? ['判定说明与边界'] : []), '量表来源与适用说明', '精确时刻',
    ...(hasBirthDetails ? ['本次对照快照与候选区间'] : []),
  ]);
  await expect(scope.locator('summary').filter({ hasText: /^本次量表版本$/ })).toHaveCount(0);
  await waitForAnimations(scope.page?.() ?? scope);
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

/** Measure painted strokes; a centered line box alone misses mixed-font offsets. */
export async function expectSnapshotInkAlignment(card) {
  const png = await card.screenshot({ scale: 'css', animations: 'disabled' });
  const groups = await card.evaluate(async (root, base64) => {
    const image = new Image();
    image.src = 'data:image/png;base64,' + base64;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const origin = root.getBoundingClientRect();

    function inkCenter(element) {
      const rect = element.getBoundingClientRect();
      const y0 = Math.floor(rect.top - origin.top);
      const y1 = Math.ceil(rect.bottom - origin.top);
      let top = Infinity;
      let bottom = -Infinity;
      for (let x = Math.round(rect.left - origin.left); x < Math.round(rect.right - origin.left); x++) {
        // Sample directly above each column to account for the card's gradient.
        const bg = 4 * ((y0 - 3) * canvas.width + x);
        for (let y = y0 - 1; y <= y1; y++) {
          const at = 4 * (y * canvas.width + x);
          const contrast = Math.abs(pixels[at] - pixels[bg]) + Math.abs(pixels[at + 1] - pixels[bg + 1])
            + Math.abs(pixels[at + 2] - pixels[bg + 2]);
          if (contrast > 81) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
        }
      }
      if (!Number.isFinite(top)) throw new Error('No visible ink for ' + element.outerHTML);
      return (top + bottom) / 2;
    }

    const samples = [...root.querySelectorAll('.constitution-snapshot__stages dd')].map(cell =>
      [...cell.querySelectorAll(':scope > span:first-child, .ds-element > span')]);
    const interval = root.querySelector('.constitution-snapshot__interval');
    if (root.dataset.kind === 'birth' && interval) {
      samples.push([...interval.querySelectorAll(':scope > span:first-child, time, [aria-hidden="true"]')]);
    }
    return samples.map(nodes => ({ text: nodes.map(n => n.textContent).join(' '), centers: nodes.map(inkCenter) }));
  }, png.toString('base64'));
  for (const { text, centers } of groups) {
    expect(Math.max(...centers) - Math.min(...centers), text).toBeLessThanOrEqual(1);
  }
}

/** Inspect text ranges too: an inline-block alone always reports one box. */
export async function expectConstitutionSegments(scope) {
  const segments = scope.locator('.constitution-context-rows > div:first-child .ds-seg, .constitution-reference-rows > div:last-child .ds-seg');
  await expect(segments.first()).toBeVisible();
  await waitForAnimations(scope.page?.() ?? scope);
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
  await waitForAnimations(result.page());
  await expect.poll(async () => reference.evaluate(element => {
    const rows = [...element.children].map(cell => cell.getBoundingClientRect());
    const range = document.createRange();
    range.selectNodeContents(element.querySelector('dd'));
    const lines = new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.top))).size;
    return rows.length === 3 && rows.every((row, i) => row.width === rows[0].width && (!i || row.top >= rows[i - 1].bottom - 1)) && lines > 0 && element.scrollWidth <= element.clientWidth + 1;
  }), { message: 'Seven matches retain three full-width rows with a wrapping summary' }).toBe(true);
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
  // Visibility and ready fonts do not settle the decision card's transform.
  await waitForAnimations(result.page());
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
  const matched = result.locator('.constitution-matched-types .constitution-match-chip');
  const mixedTypes = assessment.matchedTypes.length >= 2 ? rankedDimensions(assessment).filter(type => assessment.matchedTypes.includes(type.id)) : [];
  await expect(result.locator('.constitution-matched-types')).toHaveCount(mixedTypes.length ? 1 : 0);
  await expect(result.locator('.constitution-matched-types').getByText('兼夹', { exact: true })).toHaveCount(0);
  await expect(matched).toHaveCount(mixedTypes.length);
  const chipText = type => `${type.name} ${Math.round(type.score)}`;
  await expect(matched).toHaveText(mixedTypes.map(chipText));
  await expect(result.locator('[data-leading="true"] .constitution-match-chip')).toHaveText(mixedTypes.filter(type => type.score === mixedTypes[0].score).map(chipText));
  const chips = result.locator('.constitution-tendency-types .ds-relation__chip');
  await expect(chips).toHaveText(assessment.tendencyTypes.map(id => `${name(id).replace(/质$/, '')} 倾向`));
  await expect(result.locator('.constitution-tendency-types .ds-relation__chip:not(.ds-relation__chip--favorable)')).toHaveCount(0);
  for (const chip of await chips.all()) await expect(chip).not.toContainText(/\d/);
  if (assessment.tendencyTypes.length) {
    const tendencies = result.locator('.constitution-decision-title > .constitution-tendency-types');
    await expect(tendencies).toHaveCount(1);
    const titleRow = result.locator('.constitution-decision-title');
    const row = await titleRow.boundingBox();
    const title = await heading.boundingBox();
    const tags = await tendencies.boundingBox();
    const lastChip = await chips.last().boundingBox();
    expect(Math.abs(lastChip.x + lastChip.width - row.x - row.width)).toBeLessThanOrEqual(1);
    const count = mixedTypes.length ? await result.locator('.constitution-match-count').boundingBox() : title;
    const gap = await titleRow.evaluate(el => parseFloat(getComputedStyle(el).columnGap));
    if (row.width - (count.x + count.width - row.x) >= lastChip.width + gap) {
      expect(tags.x).toBeGreaterThanOrEqual(count.x + count.width);
      expect(Math.abs(title.y + title.height / 2 - tags.y - tags.height / 2)).toBeLessThanOrEqual(2);
    }
  }
  await expect(result.getByText(assessment.summary, { exact: true })).toHaveCount(1);
  await expect(result.getByText(assessment.boundaryNote, { exact: true })).toHaveCount(1);
}

/** F5 geometry and token checks, reused after selecting each visual theme. */
export async function expectConstitutionResultLayout(result, testInfo) {
  await expect(result.locator(':scope > section')).toHaveCount(3);
  await expect(result.locator('.constitution-decision-header > .constitution-eyebrow, .constitution-reference-card > .constitution-eyebrow, .constitution-chart-header > .constitution-eyebrow')).toHaveText(['判定', '九质转化分', '与运气互参']);
  await expect(result.getByRole('button', { name: '判定标准' })).toHaveAttribute('aria-expanded', 'false');
  const heading = result.locator('.constitution-decision h4');
  await expect(heading).toHaveCSS('outline-style', 'none');
  const birthLabel = result.locator('.constitution-reference-birth-label');
  const [label, candidates] = await Promise.all([birthLabel.boundingBox(), birthLabel.locator('..').locator('dd').boundingBox()]);
  expect(Math.abs(label.y + label.height / 2 - candidates.y - candidates.height / 2)).toBeLessThanOrEqual(1);
  expect(await heading.evaluate(element => getComputedStyle(element).fontFamily)).toContain('Noto Serif SC');
  await expect(heading).toHaveCSS('font-size', '30px');
  await expect(heading).toHaveCSS('line-height', '33px');
  await expect(heading).toHaveCSS('font-weight', '700');
  await waitForAnimations(result.page());
  const metrics = await result.evaluate(element => {
    const color = (target, token) => {
      const swatch = document.createElement('span');
      swatch.style.backgroundColor = `var(${token})`;
      target.append(swatch);
      const value = getComputedStyle(swatch).backgroundColor;
      swatch.remove();
      return value;
    };
    const plot = element.querySelector('.constitution-chart-plot').getBoundingClientRect();
    const track = element.querySelector('.constitution-bar-track').getBoundingClientRect();
    return {
      referenceRows: [...element.querySelectorAll('.constitution-reference-rows > div')].map(row => row.getBoundingClientRect().toJSON()),
      guides: [...element.querySelectorAll('.constitution-chart-guide')].map(guide => ({
        ratio: (guide.getBoundingClientRect().left - track.left) / track.width,
        height: guide.getBoundingClientRect().height, plotHeight: plot.height,
        line: getComputedStyle(guide).borderInlineStartStyle,
      })),
      rows: [...element.querySelectorAll('.constitution-bar')].map(row => {
        const track = row.querySelector('.constitution-bar-track');
        const bounds = track.getBoundingClientRect();
        return {
          columns: getComputedStyle(row).gridTemplateColumns.split(' ').map(Number.parseFloat),
          height: row.getBoundingClientRect().height, trackHeight: bounds.height,
          fill: getComputedStyle(row.querySelector('.constitution-bar-fill')).backgroundColor,
          expectedFill: color(row, row.hasAttribute('data-balanced') ? '--constitution-balanced-fill' : {
            primary: '--constitution-match-fill', secondary: '--constitution-tendency-fill', neutral: '--constitution-low-fill',
          }[row.dataset.tone]),
          matched: row.dataset.tone === 'primary' && !row.hasAttribute('data-balanced'),
          background: getComputedStyle(row).backgroundColor,
          scoreWeight: Number(getComputedStyle(row.querySelector('.constitution-bar-score')).fontWeight),
        };
      }),
    };
  });
  expect(metrics.referenceRows).toHaveLength(3);
  metrics.referenceRows.forEach((row, i) => {
    expect(row.x).toBeCloseTo(metrics.referenceRows[0].x, 0);
    expect(row.width).toBeCloseTo(metrics.referenceRows[0].width, 0);
    if (i) expect(row.y).toBeGreaterThanOrEqual(metrics.referenceRows[i - 1].bottom - 1);
  });
  expect(metrics.rows).toHaveLength(9);
  for (const row of metrics.rows) {
    expect(row.columns[0]).toBe(52);
    expect(row.columns[2]).toBe(36);
    expect(row.height).toBe(24);
    expect(row.trackHeight).toBe(8);
    expect(row.fill).toBe(row.expectedFill);
    expect(row.background).toBe('rgba(0, 0, 0, 0)');
    if (row.matched) {
      expect(row.scoreWeight).toBe(700);
    }
  }
  expect(metrics.guides).toHaveLength(2);
  metrics.guides.forEach((guide, index) => {
    expect(guide.ratio).toBeCloseTo(index === 0 ? 0.3 : 0.4, 2);
    expect(guide.height).toBe(guide.plotHeight);
    expect(guide.line).toBe('dashed');
  });
  for (const chip of await result.locator('.constitution-tendency-types .ds-relation__chip').all()) await expectTextContrast(chip);
  if (testInfo) await testInfo.attach('constitution-result-layout', { body: JSON.stringify(metrics), contentType: 'application/json' });
}
