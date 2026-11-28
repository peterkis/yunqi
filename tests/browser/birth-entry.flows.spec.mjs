import { test, expect, scanAccessibility, waitForAnimations } from './fixtures.mjs';
import { expectTextContrast } from './visual-assertions.mjs';
import { expectBirthCandidateBadges } from './birth-helpers.mjs';
import { routeBirthClock } from './test-clock.mjs';

test('lunar birthday and age resolve to the Gregorian year that satisfies the attained age', async ({ page }) => {
  await routeBirthClock(page, { current: '2026-01-01T00:00:00+08:00' });
  const checkedYears = new Set();
  page.on('request', request => {
    if (request.url().endsWith('/learning/birth-date-preview')) {
      checkedYears.add(request.postDataJSON().year);
    }
  });
  await page.goto('/yunqi/birth');
  const form = page.getByRole('form', { name: '出生运气输入' });
  await form.getByRole('radio', { name: '农历', exact: true }).click();
  await form.getByRole('textbox', { name: '年龄' }).fill('25');
  await form.getByRole('textbox', { name: '月', exact: true }).fill('8');
  await form.getByRole('textbox', { name: '日', exact: true }).fill('15');
  await expect(form.locator('[data-preview-date]')).toHaveAttribute('data-preview-date', '2000-09-12');
  expect([...checkedYears].sort()).toEqual([2000, 2001]);
  const comparison = page.waitForResponse(response => response.url().endsWith('/learning/birth-comparison'));
  await form.getByRole('button', { name: '确认并对照' }).click();
  const response = await comparison;
  expect(response.ok()).toBe(true);
  expect(response.request().postDataJSON()).toEqual({ birthDate: '2000-09-12' });
  await expect(page.getByRole('group', { name: '出生资料摘要' })).toContainText('2000-09-12');
});

test('switching a confirmed lunar birthday to age mode keeps the same Gregorian date', async ({ page }) => {
  await routeBirthClock(page, { current: '2026-01-01T00:00:00+08:00' });
  await page.goto('/yunqi/birth');
  const form = page.getByRole('form', { name: '出生运气输入' });
  await form.getByRole('radio', { name: '按出生年份' }).click();
  await form.getByRole('radio', { name: '农历', exact: true }).click();
  await form.getByRole('textbox', { name: '年', exact: true }).fill('2001');
  await form.getByRole('textbox', { name: '月', exact: true }).fill('8');
  await form.getByRole('textbox', { name: '日', exact: true }).fill('15');
  const preview = form.locator('[data-preview-date]');
  await expect(preview).toHaveAttribute('data-preview-date', '2001-10-01');
  await form.getByRole('radio', { name: '按年龄推算' }).click();
  await expect(form.getByRole('textbox', { name: '年龄' })).toHaveValue('24');
  await expect(preview).toHaveAttribute('data-preview-date', '2001-10-01');
  const comparison = page.waitForResponse(response => response.url().endsWith('/learning/birth-comparison'));
  await form.getByRole('button', { name: '确认并对照' }).click();
  const response = await comparison;
  expect(response.ok()).toBe(true);
  expect(response.request().postDataJSON()).toEqual({ birthDate: '2001-10-01' });
});

test('an age-based lunar birthday is rechecked at Beijing midnight before submitting', async ({ page }) => {
  const clock = { current: '2026-09-11T23:59:50+08:00' };
  await routeBirthClock(page, clock);
  const comparisons = [];
  page.on('request', request => {
    if (request.url().endsWith('/learning/birth-comparison')) comparisons.push(request.postDataJSON());
  });
  await page.goto('/yunqi/birth');
  const form = page.getByRole('form', { name: '出生运气输入' });
  await form.getByRole('radio', { name: '农历', exact: true }).click();
  const age = form.getByRole('textbox', { name: '年龄' });
  await age.fill('25');
  await form.getByRole('textbox', { name: '月', exact: true }).fill('8');
  await form.getByRole('textbox', { name: '日', exact: true }).fill('15');
  const preview = form.locator('[data-preview-date]');
  await expect(preview).toHaveAttribute('data-preview-date', '2000-09-12');
  clock.current = '2026-09-12T00:00:05+08:00';
  await form.getByRole('button', { name: '确认并对照' }).click();
  await expect(form.getByText(/北京日期已变更/)).toBeVisible({ timeout: 3000 });
  await expect(form.getByText(/未找到符合所填周岁/)).toBeVisible();
  await expect(form.getByRole('button', { name: '确认并对照' })).toBeDisabled();
  expect(comparisons).toEqual([]);
  await age.fill('26');
  // At 26 there are two matches, so explicitly reselect the intended birthday.
  await form.getByRole('radio', { name: /2000-09-12/ }).check();
  await expect(preview).toHaveAttribute('data-preview-date', '2000-09-12');
  const comparison = page.waitForResponse(response => response.url().endsWith('/learning/birth-comparison'));
  await form.getByRole('button', { name: '确认并对照' }).click();
  expect((await comparison).ok()).toBe(true);
  expect(comparisons).toEqual([{ birthDate: '2000-09-12' }]);
});

test('a comparison sampled just after Beijing midnight is not accepted for the previous age date', async ({ page }) => {
  const clock = { current: '2026-09-11T23:59:59.999+08:00', comparison: '2026-09-12T00:00:00+08:00' };
  await routeBirthClock(page, clock);
  await page.goto('/yunqi/birth');
  const form = page.getByRole('form', { name: '出生运气输入' });
  await form.getByRole('radio', { name: '农历', exact: true }).click();
  const age = form.getByRole('textbox', { name: '年龄' });
  await age.fill('25');
  await form.getByRole('textbox', { name: '月', exact: true }).fill('8');
  await form.getByRole('textbox', { name: '日', exact: true }).fill('15');
  await expect(form.locator('[data-preview-date]')).toHaveAttribute('data-preview-date', '2000-09-12');
  const preflight = page.waitForResponse(response => response.url().endsWith('/api/v1/yunqi/current'));
  const comparison = page.waitForResponse(response => response.url().endsWith('/learning/birth-comparison'));
  await form.getByRole('button', { name: '确认并对照' }).click();
  const [reading, response] = await Promise.all([preflight, comparison]);
  expect((await reading.json()).data.input.localTime).toBe('2026-09-11T23:59:59.999+08:00');
  expect(response.request().postDataJSON()).toEqual({ birthDate: '2000-09-12' });
  expect((await response.json()).data.current.facts.input.localTime).toBe('2026-09-12T00:00:00+08:00');
  await expect(form.getByText(/北京日期已变更/)).toBeVisible({ timeout: 3000 });
  await expect(form.getByText(/未找到符合所填周岁/)).toBeVisible();
  await expect(age).toHaveValue('25');
  await expect(page.getByRole('group', { name: '出生资料摘要' })).toHaveCount(0);
  clock.current = clock.comparison;
  await age.fill('26');
  await form.getByRole('radio', { name: /2000-09-12/ }).check();
  await form.getByRole('button', { name: '确认并对照' }).click();
  await expect(page.getByRole('group', { name: '出生资料摘要' })).toContainText('2000-09-12');
});

test('a Beijing date refresh keeps the exact time for the same birth date', async ({ page }) => {
  const clock = { current: '2026-04-28T23:59:50+08:00' };
  await routeBirthClock(page, clock);
  const comparisons = [];
  page.on('request', request => {
    if (request.url().endsWith('/learning/birth-comparison')) comparisons.push(request.postDataJSON());
  });
  await page.goto('/yunqi/birth');
  const form = page.getByRole('form', { name: '出生运气输入' });
  await form.getByRole('textbox', { name: '年龄' }).fill('2');
  await form.getByRole('textbox', { name: '月', exact: true }).fill('01');
  await form.getByRole('textbox', { name: '日', exact: true }).fill('20');
  await form.getByRole('button', { name: /补录时刻/ }).click();
  const birthTime = form.getByLabel('出生时刻');
  await birthTime.fill('22:07:21');
  clock.current = '2026-04-29T00:00:05+08:00';
  const submit = form.getByRole('button', { name: '确认并对照' });
  await submit.click();
  await expect(form.getByText(/北京日期已变更/)).toBeVisible({ timeout: 3000 });
  expect(comparisons).toEqual([]);
  await expect(birthTime).toHaveValue('22:07:21');
  const comparison = page.waitForResponse(response => response.url().endsWith('/learning/birth-comparison'));
  await submit.click();
  const response = await comparison;
  expect(response.ok()).toBe(true);
  const { data } = await response.json();
  expect(data.candidates.map(candidate => candidate.learning.facts.year)).toEqual([2023]);
  expect(data.current.facts.input.localTime).toBe('2026-04-29T00:00:05+08:00');
  expect(data.candidates[0].learning.facts.suiYun.element).toBe('火');
  expect(data.current.facts.suiYun.element).toBe('水');
  expect(data.candidates[0].comparisons.find(({ title }) => title === '中运对照')).toMatchObject({
    label: '当前克出生', relation: '当前水克出生火',
  });
  expect(comparisons).toEqual([{ birthDate: '2024-01-20', birthTime: '22:07:21' }]);
  await expect(page.getByRole('group', { name: '出生资料摘要' })).toContainText('22:07:21');
  await expect(page.getByText('时刻已知 · 归属唯一')).toBeVisible();
});

test('fast mode round trip restores the confirmed year while the age preview is unresolved', async ({ page }) => {
  await routeBirthClock(page, { current: '2026-01-01T00:00:00+08:00' });
  let release;
  const hold = new Promise(resolve => { release = resolve; });
  await page.route('**/learning/birth-date-preview', async route => {
    if (route.request().postDataJSON().year === 2002) await hold;
    await route.continue();
  });
  await page.goto('/yunqi/birth');
  const form = page.getByRole('form', { name: '出生运气输入' });
  const yearMode = form.getByRole('radio', { name: '按出生年份' });
  const year = form.getByRole('textbox', { name: '年', exact: true });
  const preview = form.locator('[data-preview-date]');
  await yearMode.click();
  await form.getByRole('radio', { name: '农历', exact: true }).click();
  await year.fill('2001');
  await form.getByRole('textbox', { name: '月', exact: true }).fill('8');
  await form.getByRole('textbox', { name: '日', exact: true }).fill('15');
  await expect(preview).toHaveAttribute('data-preview-date', '2001-10-01');
  try {
    await form.getByRole('radio', { name: '按年龄推算' }).click();
    await expect(form.getByRole('textbox', { name: '年龄' })).toHaveValue('24');
    await expect(preview).toHaveCount(0);
    await yearMode.click();
    await expect(year).toHaveValue('2001', { timeout: 3000 });
    await expect(preview).toHaveAttribute('data-preview-date', '2001-10-01');
  } finally {
    release();
  }
});

test('same-year lunar candidates preserve the year and typed age across mode changes', async ({ page }) => {
  await routeBirthClock(page, { current: '2026-06-19T12:00:00+08:00' });
  await page.goto('/yunqi/birth');
  const form = page.getByRole('form', { name: '出生运气输入' });
  await form.getByRole('radio', { name: '农历', exact: true }).click();
  const age = form.getByRole('textbox', { name: '年龄' });
  await age.fill('3');
  await form.getByRole('textbox', { name: '月', exact: true }).fill('2');
  await form.getByRole('textbox', { name: '日', exact: true }).fill('1');
  const dates = form.getByRole('group', { name: '选择对应公历日期' });
  const regular = dates.getByRole('radio', { name: /2023-02-20/ });
  const leap = dates.getByRole('radio', { name: /2023-03-22/ });
  const submit = form.getByRole('button', { name: '确认并对照' });
  await expect(regular).toBeVisible();
  await expect(leap).toBeVisible();
  await expect(submit).toBeDisabled();
  await form.getByRole('radio', { name: '按出生年份' }).click();
  await expect(form.getByRole('textbox', { name: '年', exact: true })).toHaveValue('2023', { timeout: 3000 });
  await expect(regular).not.toBeChecked();
  await expect(leap).not.toBeChecked();
  await expect(submit).toBeDisabled();
  await form.getByRole('radio', { name: '按年龄推算' }).click();
  await expect(age).toHaveValue('3');
  await expect(regular).not.toBeChecked();
  await expect(leap).not.toBeChecked();
  await expect(submit).toBeDisabled();
  await leap.check();
  await expect(submit).toBeEnabled();
});

test('returning to age mode after a birthday recalculates the age of the retained birth date', async ({ page }) => {
  await page.clock.install();
  const clock = { current: '2026-09-11T23:59:50+08:00' };
  await routeBirthClock(page, clock);
  await page.goto('/yunqi/birth');
  const form = page.getByRole('form', { name: '出生运气输入' });
  const preview = form.locator('[data-preview-date]');
  await form.getByRole('radio', { name: '农历', exact: true }).click();
  await form.getByRole('textbox', { name: '年龄' }).fill('25');
  await form.getByRole('textbox', { name: '月', exact: true }).fill('8');
  await form.getByRole('textbox', { name: '日', exact: true }).fill('15');
  await expect(preview).toHaveAttribute('data-preview-date', '2000-09-12');
  await form.getByRole('radio', { name: '按出生年份' }).click();
  await expect(form.getByRole('textbox', { name: '年', exact: true })).toHaveValue('2000');
  await expect(form.locator('.birth-entry__preview-copy')).toContainText('周岁 25 岁');
  clock.current = '2026-09-12T00:00:05+08:00';
  const refresh = page.waitForResponse(response => response.url().endsWith('/api/v1/yunqi/current'));
  await page.clock.fastForward(60_000);
  expect((await (await refresh).json()).data.input.localTime).toBe(clock.current);
  await expect(form.locator('.birth-entry__preview-copy')).toContainText('周岁 26 岁');
  await form.getByRole('radio', { name: '按年龄推算' }).click();
  await expect(form.getByRole('textbox', { name: '年龄' })).toHaveValue('26', { timeout: 3000 });
  await expect(preview).toHaveAttribute('data-preview-date', '2000-09-12');
  await expect(form.getByRole('radio', { name: /2000-09-12/ })).toBeChecked();
  const comparison = page.waitForResponse(response => response.url().endsWith('/learning/birth-comparison'));
  await form.getByRole('button', { name: '确认并对照' }).click();
  const response = await comparison;
  expect(response.ok()).toBe(true);
  expect(response.request().postDataJSON()).toEqual({ birthDate: '2000-09-12' });
});

test('editing a committed lunar birthday keeps the submitted choice when year mode reveals a leap candidate', async ({ page }) => {
  await routeBirthClock(page, { current: '2026-03-10T12:00:00+08:00' });
  await page.goto('/yunqi/birth');
  const form = page.getByRole('form', { name: '出生运气输入' });
  await form.getByRole('radio', { name: '农历', exact: true }).click();
  await form.getByRole('textbox', { name: '年龄' }).fill('3');
  await form.getByRole('textbox', { name: '月', exact: true }).fill('2');
  await form.getByRole('textbox', { name: '日', exact: true }).fill('1');
  await expect(form.locator('[data-preview-date]')).toHaveAttribute('data-preview-date', '2023-02-20');
  const summary = page.getByRole('group', { name: '出生资料摘要' });
  const submitted = page.waitForResponse(response => response.url().endsWith('/learning/birth-comparison'));
  await form.getByRole('button', { name: '确认并对照' }).click();
  expect((await submitted).request().postDataJSON()).toEqual({ birthDate: '2023-02-20' });
  await expect(summary).toContainText('2023-02-20');
  await summary.getByRole('button', { name: '修改', exact: true }).click();
  const editor = page.getByRole('dialog', { name: '修改出生信息' });
  await expect(editor.getByRole('textbox', { name: '年', exact: true })).toHaveValue('2023');
  await expect(editor.getByRole('radio', { name: /2023-02-20/ })).toBeChecked({ timeout: 3000 });
  await expect(editor.getByRole('radio', { name: /2023-03-22/ })).not.toBeChecked();
  const unchanged = page.waitForResponse(response => response.url().endsWith('/learning/birth-comparison'));
  await editor.getByRole('button', { name: '确认并对照' }).click();
  const response = await unchanged;
  expect(response.ok()).toBe(true);
  expect(response.request().postDataJSON()).toEqual({ birthDate: '2023-02-20' });
  await expect(summary).toContainText('2023-02-20');
});

test('birth boundary prompts and the submitted summary retain seconds', async ({ page }) => {
  await page.goto('/yunqi/birth');
  const form = page.getByRole('form', { name: '出生运气输入' });
  await form.getByRole('radio', { name: '按出生年份' }).click();
  await form.getByRole('textbox', { name: '年', exact: true }).fill('2024');
  await form.getByRole('textbox', { name: '月', exact: true }).fill('01');
  await form.getByRole('textbox', { name: '日', exact: true }).fill('20');
  await form.getByRole('button', { name: /补录时刻/ }).click();
  await expect(form.locator('.birth-entry__boundaries')).toContainText('22:07:22');
  await form.getByLabel('出生时刻').fill('22:07:21');
  const comparison = page.waitForResponse(response => response.url().endsWith('/learning/birth-comparison'));
  await form.getByRole('button', { name: '确认并对照' }).click();
  const response = await comparison;
  expect(response.ok()).toBe(true);
  expect(response.request().postDataJSON()).toEqual({ birthDate: '2024-01-20', birthTime: '22:07:21' });
  await expect(page.getByRole('group', { name: '出生资料摘要' })).toContainText('22:07:21');
});

test('rejecting an extra day digit preserves the confirmed date in inline and sheet entry', async ({ page }) => {
  await page.goto('/yunqi/birth');
  const form = page.getByRole('form', { name: '出生运气输入' });
  const day = form.getByRole('textbox', { name: '日', exact: true });
  const submit = form.getByRole('button', { name: '确认并对照' });
  const dock = form.locator('.birth-entry__dock');
  await expect(dock).toHaveCSS('border-width', '0px');
  await expect(dock).toHaveCSS('background-image', 'none');
  await form.getByRole('radio', { name: '按出生年份' }).click();
  await form.getByRole('textbox', { name: '年', exact: true }).pressSequentially('1974');
  await page.keyboard.type('239');
  for (const variant of ['inline', 'sheet']) {
    if (variant === 'sheet') {
      await page.getByRole('button', { name: '修改', exact: true }).click();
      await day.fill('');
      for (const digit of ['3', '7']) await form.getByRole('button', { name: digit, exact: true }).click();
    }
    await expect(day).toHaveValue('3');
    await expect(form.locator('[data-tone="attention"]')).toContainText('出生日须为 1–28。');
    await expect(form).not.toContainText('已保留原日期');
    await expect(form.locator('[data-preview-date]')).toHaveText('公历 1974-02-03');
    await expect(submit).toBeEnabled();
    const comparison = page.waitForResponse(response => response.url().endsWith('/learning/birth-comparison'));
    if (variant === 'sheet') await day.press('Enter');
    else await submit.click();
    const response = await comparison;
    expect(response.ok()).toBe(true);
    expect(response.request().postDataJSON()).toEqual({ birthDate: '1974-02-03' });
    await expect(page.getByRole('group', { name: '出生资料摘要' })).toContainText('1974-02-03');
  }
});

test('inline landscape seal follows the selected date and surfaces both annual boundary candidates', async ({ page }, testInfo) => {
  await page.goto('/yunqi/birth');
  const form = page.getByRole('form', { name: '出生运气输入' });
  const seal = form.getByRole('group', { name: '出生运气预览' });
  await form.getByRole('radio', { name: '按出生年份' }).click();
  await form.getByRole('textbox', { name: '年', exact: true }).fill('1980');
  await expect(seal).toContainText('待定');
  const month = form.getByRole('textbox', { name: '月', exact: true });
  const day = form.getByRole('textbox', { name: '日', exact: true });
  await month.fill('03');
  await day.fill('12');
  await expect(seal).toHaveText('庚申1980 · 金运太过之年');
  await page.screenshot({ path: testInfo.outputPath('resolved-seal.png') });
  const { data } = await (await page.request.get('/api/v1/yunqi/year/1980')).json();
  const boundary = data.interval.start.localTime.slice(0, 10);
  await month.fill(boundary.slice(5, 7));
  await day.fill(boundary.slice(8, 10));
  await expect(seal).toContainText('年界');
  await expect(seal).toContainText('己未年 ／ 庚申年');
  await expect(form.getByRole('button', { name: /补录时刻/ })).toBeVisible();
  await form.getByRole('radio', { name: '农历', exact: true }).click();
  await month.fill('11'); await day.fill('14');
  await expect(seal).toContainText('待核对');
  await form.getByRole('radio', { name: /1980-01-01/ }).check();
  await expect(seal).toContainText('己未');
});

for (const [width, height, dark] of [[400, 640, false], [400, 860, true], [1366, 900, false]]) {
  test(`inline birth entry annual and lunar workflows ${width}x${height} ${dark ? 'dark' : 'light'}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto('/yunqi/birth');
    const form = page.getByRole('form', { name: '出生运气输入' });
    await expect(form.getByRole('textbox', { name: '年龄' })).toBeFocused();
    await expect(form.getByText('资料仅在本次会话内使用，清空后销毁。')).toHaveCount(0);
    const placeholderOpacity = input => input.evaluate(node => getComputedStyle(node, '::placeholder').opacity);
    expect(await placeholderOpacity(form.getByRole('textbox', { name: '年龄' }))).toBe('0');
    expect(await placeholderOpacity(form.getByRole('textbox', { name: '月', exact: true }))).toBe('1');
    const seal = form.getByRole('group', { name: '出生运气预览' });
    await expect(seal).toContainText('待录出生信息');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    if (dark) {
      await page.getByRole('button', { name: '切换至深色主题' }).click();
    }
    const clock = await (await page.request.get('/api/v1/yunqi/current')).json();
    const year = Number(clock.data.input.localTime.slice(0,4));
    await form.getByRole('textbox', { name: '年龄' }).pressSequentially(String(year - 1980));
    await expect(form).toContainText('推算 1980 年');
    await expect(seal).toContainText('待定');
    await expect(form).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(form.locator('.birth-entry__dock')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(form.locator('.birth-keypad')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(form.locator('.birth-slot').first()).toHaveCSS('box-shadow', 'none');
    await expect(form.getByRole('radiogroup', { name: '出生年份录入方式' })).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(form.getByRole('button', { name: '仅按年份对照' })).toBeInViewport({ ratio: 1 });
    expect((await scanAccessibility(page)).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('age-sheet.png') });
    const yearResponse = page.waitForResponse(response => response.url().endsWith('/learning/birth-year-comparison'));
    await page.keyboard.press('Enter');
    const { data: comparison } = await (await yearResponse).json();
    const main = page.getByRole('region', { name: '出生与当前运气对照结果' });
    await expect(main.getByRole('table')).toHaveCount(2);
    await expectBirthCandidateBadges(main, comparison.candidates);
    await expect(main.getByRole('rowheader')).toHaveCount(6);
    const summary = page.getByRole('group', { name: '出生资料摘要' });
    await expect(summary).toHaveCSS('align-items', 'baseline');
    for (const name of ['修改', '清空本次资料']) {
      const action = summary.getByRole('button', { name, exact: true });
      await action.hover();
      await expect(action).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    }
    for (const interval of await main.locator('.birth-candidate-interval').all()) {
      const [label, range, start, end] = await interval.evaluate(node =>
        [node.querySelector('.birth-interval-label'), node.lastElementChild, ...node.lastElementChild.children].map(el => {
          const box = el.getBoundingClientRect();
          return { top: box.top, bottom: box.bottom };
        }));
      expect(range.top).toBeGreaterThanOrEqual(label.bottom);
      expect(start.top).toBe(end.top);
    }
    await expect(page.getByRole('button', { name: /补全生日后查看/ })).toHaveCSS('border-top-width', '0px');
    await page.getByRole('link', { name: '全部原文' }).click();
    await expect(page.getByRole('button', { name: '全年', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: '出生阶段', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: '返回', exact: true }).click();
    await page.getByRole('link', { name: '体质量表', exact: true }).click();
    const annualContext = page.getByLabel('当下与两个先天年度候选', { exact: true });
    await expect(annualContext.locator('dt')).toHaveText(['当下', '先天 大寒前', '先天 大寒起']);
    const beforeBadge = annualContext.locator('[data-boundary="before"]');
    const fromBadge = annualContext.locator('[data-boundary="from"]');
    await expect(beforeBadge).toHaveText('大寒前');
    await expect(fromBadge).toHaveText('大寒起');
    await expect(beforeBadge).toHaveCSS('border-radius', '999px');
    await expect(fromBadge).not.toHaveCSS('background-color', await beforeBadge.evaluate(node => getComputedStyle(node).backgroundColor));
    await expectTextContrast(beforeBadge);
    await expectTextContrast(fromBadge);
    await expect(annualContext.locator('.ds-element__dot')).toHaveCount(3);
    const elementKeys = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' };
    for (const [index, candidate] of comparison.candidates.entries()) {
      const element = elementKeys[candidate.suiYun.element];
      const dot = annualContext.locator('dd').nth(index + 1).locator(`.ds-element__dot--${element}`);
      await expect(dot).toHaveCSS('width', '8px');
      const token = element === 'metal' ? '--element-metal-ring' : `--element-${element}`;
      const hex = await dot.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name).trim(), token);
      const rgb = `rgb(${[1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)).join(', ')})`;
      if (element === 'metal') expect(await dot.evaluate(node => getComputedStyle(node).boxShadow)).toContain(rgb);
      else await expect(dot).toHaveCSS('background-color', rgb);
    }
    await expect(page.getByRole('form', { name: '中医体质量表' })).toBeVisible();
    await page.getByRole('radio', { name: '男性量表', exact: true }).click();
    await expect(page.locator('.constitution-position')).toContainText('已答 0 / 26');
    const columns = await annualContext.locator(':scope > div').evaluateAll(items => items.map(item => ({
      x: item.offsetLeft, width: item.getBoundingClientRect().width,
      heading: item.querySelector('dt').getBoundingClientRect().top,
      period: item.querySelector('.constitution-context-period').getBoundingClientRect().top,
      element: item.querySelector('.ds-element').getBoundingClientRect().top,
    })));
    expect(columns[0].x).toBeLessThan(columns[1].x);
    expect(columns[1].x).toBeLessThan(columns[2].x);
    for (const column of columns.slice(1)) {
      expect(column.width).toBeCloseTo(columns[0].width, 0);
      expect(column.heading).toBe(columns[0].heading);
      expect(column.period).toBe(columns[0].period);
      expect(column.element).toBe(columns[0].element);
    }
    await page.getByRole('link', { name: '先天对照' }).click();
    await page.getByRole('button', { name: /补全生日后查看/ }).click();
    const sheet = page.getByRole('dialog', { name: '修改出生信息' });
    await expect(sheet).toBeVisible();
    await expect(form.getByRole('textbox', { name: '月', exact: true })).toBeFocused();
    await expect(sheet.getByRole('group', { name: '出生运气预览' })).toHaveCount(0);
    await expect(sheet.getByRole('button', { name: '退格' }).locator('.lucide-x')).toHaveCount(1);
    await form.getByRole('textbox', { name: '月', exact: true }).fill('12');
    await expect(form).toContainText('已按出生月自动修正为 1979 年');
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole('button', { name: /补全生日后查看/ })).toBeFocused();
    await expect(page.getByRole('group', { name: '出生资料摘要' })).toContainText('1980 年');
    await page.getByRole('button', { name: '修改', exact: true }).click();
    await expect(form.getByRole('textbox', { name: '年', exact: true })).toHaveValue('1980');
    await expect(form.getByRole('textbox', { name: '月', exact: true })).toHaveValue('');
    await expect(form.getByRole('textbox', { name: '日', exact: true })).toHaveValue('');
    const month = form.getByRole('textbox', { name: '月', exact: true });
    const fieldY = () => form.locator('.birth-slot__value').evaluateAll(items => items.map(item => item.getBoundingClientRect().bottom));
    await waitForAnimations(page);
    const before = await fieldY();
    await month.fill('13');
    await expect(month).toHaveValue('');
    expect(await fieldY()).toEqual(before);
    await expect(form.locator('[data-tone="error"]')).toContainText('出生月须为');
    await expect(month).toHaveCSS('font-family', /monospace/);
    await expect(form.getByRole('button', { name: '退格' }).locator('svg')).toHaveCount(1);
    await form.getByRole('radio', { name: '农历', exact: true }).click();
    await form.getByRole('textbox', { name: '月', exact: true }).fill('10');
    await form.getByRole('textbox', { name: '日', exact: true }).fill('03');
    await expect(form).toContainText('十月初三 · 1980-11-10');
    await page.screenshot({ path: testInfo.outputPath('lunar-sheet.png') });
    await form.getByRole('button', { name: '确认并对照' }).click();
    await expect(main.getByRole('rowheader')).toHaveCount(5);
    const originalTable = await main.getByRole('table').innerText();
    await page.getByRole('button', { name: '修改', exact: true }).click();
    await expect(form.getByRole('radio', { name: '农历', exact: true })).toBeChecked();
    const editYear = form.getByRole('textbox', { name: '年', exact: true });
    await expect(editYear).toBeFocused();
    expect(await editYear.evaluate(el => [el.selectionStart, el.selectionEnd])).toEqual([0, 4]);
    await expect(form.getByRole('textbox', { name: '月', exact: true })).toHaveValue('10');
    await expect(form.getByRole('textbox', { name: '日', exact: true })).toHaveValue('03');
    await page.keyboard.type('1981');
    await expect(editYear).toHaveValue('1981');
    await expect(form.getByRole('textbox', { name: '月', exact: true })).toBeFocused();
    // Click the exposed scrim inside the panel with a real pointer.
    await sheet.click({ position: { x: 8, y: 8 } });
    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole('button', { name: '修改', exact: true })).toBeFocused();
    await expect(page.getByRole('group', { name: '出生资料摘要' })).toContainText('1980-11-10');
    expect(await main.getByRole('table').innerText()).toBe(originalTable);
    await page.getByRole('button', { name: '修改', exact: true }).click();
    await expect(form.getByRole('textbox', { name: '年', exact: true })).toHaveValue('1980');
    await expect(form.getByRole('radio', { name: '农历', exact: true })).toBeChecked();
    await form.getByRole('textbox', { name: '月', exact: true }).fill('11');
    await form.getByRole('textbox', { name: '日', exact: true }).fill('14');
    await expect(form.getByRole('radio', { name: /1980-01-01/ })).toBeVisible();
    await form.getByRole('radio', { name: /1980-12-20/ }).check();
    await form.getByRole('button', { name: '确认并对照' }).click();
    await expect(page.getByRole('group', { name: '出生资料摘要' })).toContainText('1980-12-20');
  });
}
