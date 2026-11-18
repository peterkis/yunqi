import { expect, expectCompactTimes } from './fixtures.mjs';

export async function fillBirthDate(page, value) {
  const parts = value ? value.split('-') : ['', '', ''];
  const field = page.getByRole('group', { name: '出生日期（公历）', exact: true });
  for (const [index, name] of ['年', '月', '日'].entries()) {
    await field.getByRole('textbox', { name, exact: true }).fill(parts[index]);
  }
  await expect(page.locator('input[type="date"], input[type="radio"]')).toHaveCount(0);
}

export async function expectBirthDate(page, value) {
  const parts = value ? value.split('-') : ['', '', ''];
  for (const [index, name] of ['年', '月', '日'].entries()) {
    await expect(page.getByRole('textbox', { name, exact: true })).toHaveValue(parts[index]);
  }
}

export async function expandBirthInput(page) {
  await page.getByRole('button', { name: '修改', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '年', exact: true })).toBeFocused();
}

export async function expectBirthReadings(container, passages) {
  const cards = container.locator('.classics-card');
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
    await expect(card.locator('blockquote p').last()).toHaveText(quote);
    await expect(card.getByText('原 文', { exact: true })).toBeVisible();
    await expect(card.getByText('释 义', { exact: true })).toBeVisible();
    await expect(card.locator('.classics-card__interpretation > p')).toHaveText(passage.explanation);
    await expect(card.locator('.classics-card__source > p')).toHaveText(`《${passage.work}·${passage.chapter}》${passage.section}`);
    await expect(card.getByRole('link', { name: /^出处/ })).toHaveAttribute('href', passage.sourceUrl);
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
    await expect(article.locator('.birth-table__time time')).toHaveAttribute('datetime', data.current.facts.input.localTime);
    await expect(article.locator('.birth-table__time')).toContainText('北京时间 UTC+08');
    await expect(table.getByRole('columnheader')).toHaveCount(3);
    await expect(table.getByRole('columnheader', { name: /^先天/ })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: '关系', exact: true })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: /^当下/ })).toBeVisible();
    await expect(table.getByRole('rowheader')).toHaveCount(5);
    await expect(table.locator('thead time, thead .num')).toHaveCount(0);
    await expect(table.locator('.birth-table__year strong')).toHaveText([candidate.learning.facts.stemBranch.ganzhi, data.current.facts.stemBranch.ganzhi]);
    await expect(article.locator('.birth-table__years')).toHaveText(`运气年：先天 ${candidate.learning.facts.year} · 当下 ${data.current.facts.year}`);
    for (const [position, title] of dimensions.entries()) {
      const row = table.locator('tbody tr').nth(position);
      await expect(row.getByRole('rowheader', { name: names[position], exact: true })).toHaveAttribute('scope', 'row');
      const relation = candidate.comparisons.find(item => item.title === title);
      expect(relation, `Real API supplies ${title}`).toBeDefined();
      await expect(row.locator('.ds-relation__chip')).toHaveText(relation.label);
      await expect(row.locator('.birth-table__relation > .visually-hidden')).toHaveText(relation.relation);
      await expect(row.locator('.birth-table__relation > .visually-hidden')).toHaveCSS('clip-path', 'inset(50%)');
      await expect(row.locator('.ds-relation__explanation')).toHaveCount(0);
      const cells = row.locator('td');
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
          await expect(cell).toContainText(`主${learning.facts.currentStep.hostQi} · 客${learning.facts.currentStep.guestQi}`);
        }
        if (position === 4) {
          await expect(cell).toContainText(learning.currentMovement.name);
          await expect(cell).toContainText(`主${learning.currentMovement.host.tone} · 客${learning.currentMovement.guest.tone}`);
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

// F6: check the text inside each inline-block as well as its single outer box.
export async function expectBirthDetailSegments(page, testInfo) {
  const table = page.getByRole('table').first();
  for (const name of ['所处气', '所处运']) {
    const row = table.getByRole('rowheader', { name, exact: true }).locator('..');
    await expect(row.locator('.birth-table__detail .ds-seg')).toHaveCount(4);
  }
  let measurements;
  await expect(async () => {
    measurements = await table.locator('.birth-table__detail:has(.ds-seg)').evaluateAll(details => details.map(detail => ({
      row: detail.closest('tr').querySelector('.birth-table__dimension-label').textContent,
      side: detail.closest('td').classList.contains('birth-table__birth') ? 'birth' : 'current',
      align: getComputedStyle(detail).textAlign,
      overflowWrap: getComputedStyle(detail).overflowWrap,
      bounds: detail.getBoundingClientRect().toJSON(),
      segments: [...detail.querySelectorAll('.ds-seg')].map(segment => {
        const range = document.createRange();
        range.selectNodeContents(segment.querySelector('.ds-seg__text'));
        return {
          text: segment.textContent,
          boxes: segment.getClientRects().length,
          lines: new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.top))).size,
          bounds: segment.getBoundingClientRect().toJSON(),
          fits: segment.scrollWidth <= segment.clientWidth + 1,
        };
      }),
    })));
    expect(measurements.length).toBeGreaterThan(0);
    for (const detail of measurements) {
      expect(detail.align).toBe(detail.side === 'birth' ? 'right' : 'left');
      expect(detail.overflowWrap).toBe('break-word');
      for (const segment of detail.segments) {
        expect(segment.boxes, segment.text).toBe(1);
        expect(segment.lines, segment.text).toBe(1);
        expect(segment.fits, segment.text).toBe(true);
      }
      const first = detail.segments[0].bounds;
      const last = detail.segments.at(-1).bounds;
      if (detail.row === '所处气') expect(last.top).toBeGreaterThan(first.top);
      if (detail.side === 'birth') expect(Math.abs(last.right - detail.bounds.right)).toBeLessThanOrEqual(1);
      else {
        expect(Math.abs(first.left - detail.bounds.left)).toBeLessThanOrEqual(1);
        if (last.top > first.top + 1) expect(Math.abs(last.left - detail.bounds.left)).toBeLessThanOrEqual(1);
      }
    }
  }).toPass();
  await testInfo.attach('birth-detail-segments', { body: JSON.stringify(measurements, null, 2), contentType: 'application/json' });
}

// Measure the actual value/dot groups, so equal cell widths alone cannot hide
// an incorrectly aligned value. Used by flows and every birth visual project.
export async function expectBirthMirror(page) {
  const tables = page.locator('.birth-table');
  expect(await tables.count()).toBeGreaterThan(0);
  await expect(async () => {
    const measurements = await tables.evaluateAll(elements => elements.map(table => {
      const bounds = table.getBoundingClientRect();
      const centre = (bounds.left + bounds.right) / 2;
      return {
        columns: getComputedStyle(table.querySelector('tr')).gridTemplateColumns.split(' ').map(Number.parseFloat),
        rows: [...table.querySelectorAll('tbody tr')].map(row => {
          const measure = side => {
            const value = row.querySelector(`.birth-table__${side} .ds-element`);
            const dot = value.querySelector('.ds-element__dot').getBoundingClientRect();
            const text = value.querySelector('span:not(.ds-element__dot)').getBoundingClientRect();
            return { bounds: value.getBoundingClientRect().toJSON(), dot: dot.toJSON(), text: text.toJSON() };
          };
          return { centre, birth: measure('birth'), current: measure('current') };
        }),
      };
    }));
    for (const table of measurements) {
      expect(table.columns).toHaveLength(3);
      expect(table.columns[1]).toBe(96);
      expect(Math.abs(table.columns[0] - table.columns[2])).toBeLessThanOrEqual(2);
      expect(table.rows).toHaveLength(5);
      for (const row of table.rows) {
        const leftGap = row.centre - row.birth.bounds.right;
        const rightGap = row.current.bounds.left - row.centre;
        expect(leftGap).toBeGreaterThanOrEqual(0);
        expect(rightGap).toBeGreaterThanOrEqual(0);
        expect(Math.abs(leftGap - rightGap), 'Both values sit equally far from the relation axis (±2px)').toBeLessThanOrEqual(2);
        expect(row.birth.dot.left).toBeGreaterThanOrEqual(row.birth.text.right);
        expect(row.current.dot.right).toBeLessThanOrEqual(row.current.text.left);
      }
    }
  }).toPass();
}
