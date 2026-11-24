import { fillBirthDate, expectBirthMirror, expectBirthDetailSegments } from './birth-helpers.mjs';
import { test, expect, settle, screenshot, expectPanelLayout, expectTypeScale, expectCompactTimes, scanAccessibility } from './fixtures.mjs';
import { answerConstitution, constitutionResultValues, expectConstitutionAnswerLayout, expectConstitutionResults, expectConstitutionResultLayout, expectConstitutionDisclosures, expectConstitutionSegments } from './constitution-helpers.mjs';
import { expectClassicsCards, expectFocusRings, expectViewControls } from './visual-assertions.mjs';
import { expectClassicsAlignment, expectMoreRows, expectPillGeometry } from './consistency-helpers.mjs';
import { expectCurrentStageFacts, useCalculatedCurrentSnapshot } from './stage-facts-helpers.mjs';

const cases = [
  { name: 'current', path: '/yunqi/current', current: true },
  { name: 'current-stage-facts', path: '/yunqi/current', current: true, snapshot: '2026-11-18T08:44:00+08:00' },
  { name: 'current-classics', path: '/yunqi/current/classics', classics: true, snapshot: '2026-11-18T08:44:00+08:00' },
  { name: 'annual-classics', path: '/yunqi/current/classics', classics: true, annualClassics: true, snapshot: '2026-11-18T08:44:00+08:00' },
  { name: 'annual-entry', path: '/yunqi/year', ready: '选择运气年' },
  { name: 'annual-result', path: '/yunqi/year/2024', ready: '年度概览' },
  { name: 'annual-invalid', path: '/yunqi/year/1899', ready: '选择运气年', message: '年份范围应为 1900–2100' },
  { name: 'annual-error', path: '/yunqi/year/2024', ready: '选择运气年', outage: '/api/v1/yunqi/year/2024', message: '年度数据加载失败' },
  { name: 'calculate-entry', path: '/yunqi/calculate', ready: '指定时点分析' },
  { name: 'calculate-result', path: '/yunqi/calculate', ready: '指定时点分析', calculate: true },
  { name: 'calculate-error', path: '/yunqi/calculate', ready: '指定时点分析', calculate: true, outage: '/api/v1/yunqi/calculate', message: '指定时点分析失败，请重试' },
  { name: 'calculate-dirty', path: '/yunqi/calculate', ready: '指定时点分析', calculate: true, dirty: true },
  { name: 'inquiry', path: '/yunqi/inquiry', ready: '问诊结构化入口' },
  { name: 'birth-entry', path: '/yunqi/birth', ready: '出生运气对照' },
  { name: 'birth-result', path: '/yunqi/birth', ready: '出生运气对照', birth: true, birthDate: '1980-03-12', snapshot: '2026-11-18T08:44:00+08:00' },
  { name: 'birth-boundary', path: '/yunqi/birth', ready: '出生运气对照', birth: true, birthBoundary: true },
  { name: 'birth-classics', path: '/yunqi/birth', ready: '出生运气对照', birth: true, birthClassics: true },
  { name: 'birth-annual-classics', path: '/yunqi/birth', ready: '出生运气对照', birth: true, birthClassics: true, annualClassics: true },
  { name: 'birth-assessment', path: '/yunqi/birth', ready: '出生运气对照', birth: true, birthAssessment: true, questionnaire: true },
  { name: 'birth-assessment-last-question', path: '/yunqi/birth', ready: '出生运气对照', birth: true, birthAssessment: true, questionnaire: true, constitutionLastQuestion: true },
  { name: 'birth-assessment-result', path: '/yunqi/birth', ready: '出生运气对照', birth: true, birthAssessment: true, questionnaire: true, constitutionResult: true },
  { name: 'constitution-entry', path: '/yunqi/constitution', ready: '中医体质测评' },
  { name: 'constitution-questions', path: '/yunqi/constitution', ready: '中医体质测评', questionnaire: true, snapshot: '2026-11-18T08:44:00+08:00' },
  { name: 'constitution-last-question', path: '/yunqi/constitution', ready: '中医体质测评', questionnaire: true, constitutionLastQuestion: true },
  { name: 'constitution-result', path: '/yunqi/constitution', ready: '中医体质测评', questionnaire: true, constitutionResult: true, snapshot: '2026-11-18T08:44:00+08:00' },
  { name: 'not-found', path: '/yunqi/inquiry/new', ready: '页面未找到' },
  { name: 'collapsed-pill', path: '/yunqi/current', current: true, collapsed: true, snapshot: '2026-11-18T08:44:00+08:00' },
];

async function expectSingleTextLine(locator) {
  await expect(locator).toBeVisible();
  await expect.poll(async () => locator.evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const lines = new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.top)));
    return lines.size === 1 && element.scrollWidth <= element.clientWidth + 1;
  }), { message: 'Summary text stays on one line without splitting words' }).toBe(true);
}

for (const state of cases) {
  test(`@visual ${state.name}: screenshot, readable layout and accessibility`, async ({ page, acceptanceTheme, diagnostics }, testInfo) => {
    if (state.outage) {
      diagnostics.allowHttpFailure(state.outage, 503);
      await page.route(`**${state.outage}`, route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
    }
    if (state.snapshot) await useCalculatedCurrentSnapshot(page, state.snapshot);
    const currentResponse = state.current ? page.waitForResponse(response => response.url().endsWith('/learning/current')) : undefined;
    await page.goto(state.path);
    if (state.current) {
      const { data } = await (await currentResponse).json();
      await expect(page.getByRole('region', { name: `全年\u202f·\u202f${data.facts.year}` })).toBeVisible();
      await expectCurrentStageFacts(page, data);
    }
    else if (state.classics) {
      await expect(page.getByRole('group', { name: '原文范围' })).toBeVisible();
      if (state.annualClassics) await page.getByRole('button', { name: '全年', exact: true }).click();
    } else if (state.path === '/yunqi/birth') await expect(page.getByRole('form', { name: '出生运气输入' })).toBeVisible();
    else await expect(page.getByRole('main').getByRole('heading', { name: state.ready, exact: true })).toBeVisible();
    if (state.name === 'annual-entry') {
      await expect(page.locator('.drilldown-annual-summary')).toBeVisible();
      const inputHeight = await page.locator(':root').evaluate(root => getComputedStyle(root).getPropertyValue('--input-height').trim());
      await expect(page.getByRole('combobox', { name: '分析年份' })).toHaveCSS('height', inputHeight);
      await expect(page.getByRole('combobox', { name: '分析年份' })).toHaveCSS('appearance', 'none');
    }
    if (state.name === 'constitution-entry') {
      const editions = page.getByRole('radiogroup', { name: '量表所用性别' });
      const male = editions.getByRole('radio', { name: '男性量表' });
      const female = editions.getByRole('radio', { name: '女性量表' });
      const [left, right] = await Promise.all([male.boundingBox(), female.boundingBox()]);
      expect(left.y).toBe(right.y);
      expect(left.height).toBe(right.height);
      expect(left.width).toBeCloseTo(right.width, 0);
      expect(right.x).toBeGreaterThan(left.x + left.width);
      await expect(male).not.toBeChecked();
      await expect(female).not.toBeChecked();
      for (const [card, glyph] of [[male, 'mars'], [female, 'venus']]) {
        const art = card.locator('.constitution-edition-art');
        await expect(art).toHaveAttribute('aria-hidden', 'true');
        await expect(art).toHaveCSS('pointer-events', 'none');
        await expect(art).toHaveCSS('background-image', /^radial-gradient\(/);
        const watermark = art.locator(`svg.lucide-${glyph}`);
        await expect(watermark).toBeVisible();
        await expect(watermark).toHaveCSS('stroke-width', '2px');
      }
      const notes = page.locator('.constitution-notes > details > summary');
      await expect(notes).toHaveCount(3);
      const layout = await page.locator('.constitution-session[data-entry]').evaluate(session => {
        const main = session.closest('main');
        const cards = session.querySelector('.constitution-sex [role="radiogroup"]').getBoundingClientRect();
        const privacy = session.querySelector('.constitution-session-footer').getBoundingClientRect();
        const disclosures = session.querySelector('.constitution-notes').getBoundingClientRect();
        return {
          gap: privacy.top - cards.bottom, afterPrivacy: disclosures.top >= privacy.bottom,
          bottomInset: main.getBoundingClientRect().bottom - disclosures.bottom,
          padding: parseFloat(getComputedStyle(main).paddingBottom),
        };
      });
      expect(layout.gap).toBeGreaterThanOrEqual(16);
      expect(layout.gap).toBeLessThanOrEqual(40);
      expect(layout.afterPrivacy).toBe(true);
      expect(layout.bottomInset).toBeCloseTo(layout.padding, 0);
      for (const summary of await notes.all()) {
        const arrow = summary.locator('svg');
        await expect(arrow).toBeVisible();
        await expect(arrow).toHaveCSS('transform', 'none');
        await summary.press('Enter');
        await expect(arrow).toHaveCSS('transform', 'matrix(0, 1, -1, 0, 0, 0)');
        await summary.press('Space');
        await expect(arrow).toHaveCSS('transform', 'none');
      }
      await page.getByRole('main').evaluate(el => { el.scrollTop = 0; });
      await page.locator(':focus').evaluateAll(nodes => nodes.forEach(node => node.blur()));
    }
    if (state.name === 'birth-entry') {
      await expect(page.getByRole('textbox', { name: '年龄' })).toBeFocused();
      if (acceptanceTheme === 'dark') {
        await page.getByRole('button', { name: '切换至深色主题' }).click();
      }
      await expect(page.getByRole('button', { name: '仅按年份对照' })).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expectPanelLayout(page);
      expect((await scanAccessibility(page)).violations).toEqual([]);
      await screenshot(page, testInfo, state.name);
      return;
    }
    if (state.path === '/yunqi/birth' || state.path === '/yunqi/constitution') {
      await expect(page.locator('input[type="date"], input[type="radio"]')).toHaveCount(0);
    }
    if (state.calculate) {
      await page.getByLabel('分析时间', { exact: true }).fill('2024-01-20T22:07:22');
      await page.getByRole('button', { name: '开始分析', exact: true }).click();
      if (state.outage) {
        await expect(page.getByRole('alert')).toContainText(state.message);
      } else {
        await expect(page.getByRole('region', { name: '指定时点分析结果', exact: true })).toBeVisible();
      }
      if (state.dirty) {
        await page.getByLabel('分析时间', { exact: true }).fill('2024-01-21T22:07:22');
        await expect(page.getByRole('status')).toHaveText('输入已修改，请重新分析');
        await expect(page.getByRole('region', { name: '指定时点分析结果', exact: true })).toHaveCount(0);
      }
    }
    if (state.message) await expect(page.getByRole('alert')).toContainText(state.message);
    if (state.birth) {
      const responsePromise = page.waitForResponse(response => response.url().endsWith('/learning/birth-comparison'));
      const birthDate = state.birthDate ?? '1990-05-12';
      await fillBirthDate(page, birthDate);
      await page.getByRole('button', { name: '确认并对照' }).click();
      await expect(page.getByRole('region', { name: '出生与当前运气对照结果' })).toBeVisible();
      const { data } = await (await responsePromise).json();
      await expect(page.getByRole('group', { name: '出生资料摘要' })).toContainText(`${birthDate} · 时刻不详 · 修改`);
      if (state.birthBoundary) {
        await page.getByRole('button', { name: '修改', exact: true }).click();
        await expect(page.getByRole('textbox', { name: '年', exact: true })).toBeFocused();
        await fillBirthDate(page, data.current.facts.interval.start.localTime.slice(0, 10));
        const boundaryResponse = page.waitForResponse(response => response.url().endsWith('/learning/birth-comparison'));
        await page.getByRole('button', { name: '确认并对照' }).click();
        const { data: boundary } = await (await boundaryResponse).json();
        expect(boundary.ambiguous).toBe(true);
        await expect(page.locator('.birth-table')).toHaveCount(boundary.candidates.length);
      }
      if (state.birthClassics) {
        await page.getByRole('link', { name: '全部原文', exact: true }).click();
        await expect(page.getByRole('region', { name: '先天原文与释义', exact: true })).toBeVisible();
        if (state.annualClassics) await page.getByRole('button', { name: '全年', exact: true }).click();
      }
    }
    if (state.birthAssessment) {
      await page.getByRole('button', { name: '同时测评体质', exact: true }).click();
    }
    if (state.questionnaire) {
      if (state.constitutionLastQuestion || state.constitutionResult) {
        const scored = await answerConstitution(page, page, state.constitutionResult ? { values: constitutionResultValues } : { stopBeforeLast: true });
        if (state.constitutionResult) {
          const { data } = await (await scored.response()).json();
          expect(data.matchedTypes).toEqual(['phlegm_dampness']);
          expect(data.tendencyTypes).toEqual(['qi_stagnation', 'special_diathesis']);
          await expectConstitutionResults(page, data);
        }
      } else {
        await page.getByRole('radio', { name: '男性量表', exact: true }).click();
        await expect(page.locator('.constitution-question-screen')).toHaveCount(1);
        await expect(page.getByRole('radiogroup').getByRole('radio')).toHaveCount(5);
        // F4 first-screen reference: five answers retained, editing question 5.
        for (let number = 1; number <= 5; number += 1) {
          await expect(page.locator('.constitution-position')).toHaveAttribute('aria-label', new RegExp(`当前第 ${number} 题`));
          await page.keyboard.press('3');
        }
        await expect(page.locator('.constitution-position')).toHaveAttribute('aria-label', /当前第 6 题/);
        await page.getByRole('button', { name: '上一题', exact: true }).click();
        await expect(page.locator('.constitution-question-title')).toBeFocused();
        await page.getByRole('main').evaluate(main => { main.scrollTop = 0; });
      }
    }
    if (acceptanceTheme === 'dark') {
      await page.getByRole('button', { name: '切换至深色主题', exact: true }).click();
      await expect(page.getByRole('button', { name: '切换至浅色主题', exact: true })).toBeVisible();
    }
    await expect(page.locator('.theme-root')).toHaveAttribute('data-theme', acceptanceTheme);
    await settle(page);
    // F6: the six requested dark references all use the same application
    // toggle, screenshot, typography, local-resource and axe gates.
    if (state.collapsed) {
      await page.getByRole('button', { name: '收起为胶囊条', exact: true }).click();
      await page.setViewportSize({ width: 424, height: 88 });
      const pill = page.getByRole('button', { name: /^展开运气通/ });
      await expect(pill).toBeVisible();
      await expectPillGeometry(page, pill);
      await screenshot(page, testInfo, state.name);
      const scan = await scanAccessibility(page);
      await testInfo.attach('axe-results', { body: JSON.stringify(scan), contentType: 'application/json' });
      expect(scan.violations).toEqual([]);
      return;
    }
    await expectCompactTimes(page);
    const panelLayout = await expectPanelLayout(page);
    if (state.current) {
      // Recheck the solid year-wheel segments and all seven aligned grid rows
      // in the selected theme, alongside the existing
      // typography, geometry, screenshot and axe gates in every matrix project.
      const { data } = await (await currentResponse).json();
      const annual = page.getByRole('region', { name: `全年\u202f·\u202f${data.facts.year}` });
      await expectSingleTextLine(annual.locator('.ds-info-card__label'));
      await expectCurrentStageFacts(page, data);
      await expectMoreRows(page);
      if (panelLayout.viewport.width === 1366 && panelLayout.viewport.height === 768) {
        expect(await page.getByRole('main').evaluate(content => content.scrollTop), 'Current view opens at the first screen').toBe(0);
        await expect(page.locator('.current-year-heading h3')).toBeInViewport({ ratio: 1 });
        for (const heading of await page.locator('.current-period-cell--title h3').all()) await expect(heading).toBeInViewport({ ratio: 1 });
      }
    }
    if (state.classics) {
      await expectClassicsAlignment(page);
      await expectClassicsCards(page, testInfo);
      const cards = page.locator('.classics-card');
      const currentCards = page.locator('.classics-card--current');
      await expect(currentCards).toHaveCount(state.annualClassics ? 0 : await cards.count());
      await expect(cards.locator('.classics-card__badge')).toHaveText(
        Array.from({ length: await cards.count() }, () => state.annualClassics ? '全年适用' : '正在此段'));
      const notice = page.getByText('原文为文献线索，非个体发病预测', { exact: true });
      const readings = page.locator('.current-classics__readings');
      expect(await readings.locator(':scope > :last-child').getAttribute('class')).toBe('classics-reading-notice');
      await expect(notice).toHaveCount(1);
      await expect(notice).toBeInViewport({ ratio: 1 });
      for (const summary of await readings.locator('details > summary').all()) {
        await summary.press('Enter');
        await summary.locator('..').locator('blockquote').scrollIntoViewIfNeeded();
        await expect(notice).toBeInViewport({ ratio: 1 });
        await summary.press('Space');
      }
      for (const position of ['bottom', 'top']) {
        await readings.evaluate((region, to) => { region.scrollTop = to === 'bottom' ? region.scrollHeight : 0; }, position);
        await expect(notice).toBeInViewport({ ratio: 1 });
      }
      expect(await page.getByRole('main').evaluate(main => main.scrollHeight - main.clientHeight)).toBeLessThanOrEqual(1);
    }
    if (state.birthClassics) {
      await expectClassicsCards(page, testInfo);
      await expect(page.locator('.classics-card--current')).toHaveCount(0);
      const readings = page.locator('.birth-classics__readings');
      const notice = readings.locator(':scope > .classics-reading-notice');
      await expect(notice).toHaveCount(1);
      const badges = readings.locator('.birth-reading-candidate .classics-card__badge');
      await expect(badges).toHaveText(Array.from({ length: await badges.count() }, () => state.annualClassics ? '全年适用' : '出生阶段'));
      for (const summary of await readings.locator('.classics-card details > summary').all()) {
        if (!await summary.isVisible()) continue;
        await summary.press('Enter');
        await summary.locator('..').locator('blockquote').scrollIntoViewIfNeeded();
        await expect(notice).toBeInViewport({ ratio: 1 });
        await summary.press('Space');
      }
      for (const position of ['bottom', 'top']) {
        await readings.evaluate((region, to) => { region.scrollTop = to === 'bottom' ? region.scrollHeight : 0; }, position);
        await expect(notice).toBeInViewport({ ratio: 1 });
      }
    }
    if (state.name === 'birth-result') {
      await expectBirthDetailSegments(page, testInfo);
      await expectSingleTextLine(page.getByRole('group', { name: '出生资料摘要' }).locator('.num'));
    }
    if (state.name === 'birth-result' && panelLayout.viewport.width === 1366 && panelLayout.viewport.height === 768) {
      expect(await page.getByRole('main').evaluate(content => content.scrollTop), 'Submission keeps the first screen at the top').toBe(0);
      const table = page.getByRole('table').first();
      for (const heading of await table.getByRole('columnheader').all()) await expect(heading).toBeInViewport({ ratio: 1 });
      for (const cell of await table.locator('tbody').first().locator('tr').first().locator('th, td').all()) await expect(cell).toBeInViewport({ ratio: 1 });
    }
    if (state.current && panelLayout.viewport.height === 640) {
      const main = page.getByRole('main');
      await main.evaluate(content => { content.scrollTop = content.scrollHeight; });
      expect(await main.evaluate(content => content.scrollTop), 'Minimum-height panel scrolls its content').toBeGreaterThan(0);
      const scrolled = await expectPanelLayout(page);
      expect(scrolled.header).toEqual(panelLayout.header);
      expect(scrolled.navigation).toEqual(panelLayout.navigation);
      expect(scrolled.footer).toEqual(panelLayout.footer);
      await screenshot(page, testInfo, 'current-min-height-scrolled');
      await main.evaluate(content => { content.scrollTop = 0; });
    }
    const controls = await expectViewControls(page, testInfo);
    if (state.name.startsWith('birth') && !state.birthClassics) {
      const labels = state.birthAssessment ? [] : state.birth ? ['同时测评体质'] : ['查看对照'];
      expect(controls.primary.map(control => control.label)).toEqual(labels);
    }
    if (state.birthAssessment || state.name.startsWith('constitution')) {
      const destroy = page.getByRole('button', { name: '结束并销毁', exact: true });
      await expect(destroy).toHaveCount(state.questionnaire ? 1 : 0);
      if (state.questionnaire) await expect(destroy).toHaveClass(/ds-button--secondary/);
      await expect(page.locator('footer.constitution-session-footer')).toHaveCount(state.questionnaire && !state.constitutionResult ? 0 : 1);
      await expectConstitutionDisclosures(page, testInfo, Boolean(state.constitutionResult));
    }
    if (state.name.startsWith('birth') || state.name.startsWith('constitution')) {
      for (const primary of await page.locator('.ds-button--primary').all()) {
        expect(await primary.evaluate(button => button.closest('.panel-shell__actions') !== null)).toBe(true);
      }
      const actions = page.locator('.panel-shell__actions');
      if (await actions.count()) {
        await expect(actions).toBeInViewport({ ratio: 1 });
        const bounds = await actions.boundingBox();
        const main = page.getByRole('main');
        const scrollTop = await main.evaluate(content => content.scrollTop);
        await main.evaluate(content => { content.scrollTop = content.scrollHeight; });
        expect(await actions.boundingBox()).toEqual(bounds);
        await expect(actions).toBeInViewport({ ratio: 1 });
        await main.evaluate((content, top) => { content.scrollTop = top; }, scrollTop);
        expect(await actions.evaluate(element => element.previousElementSibling.matches('.panel-shell__content') && element.nextElementSibling.matches('.panel-shell__footer'))).toBe(true);
      }
    }
    if (state.birth && !state.birthClassics && !state.birthAssessment) {
      await expectBirthMirror(page);
      const birthLayout = await page.locator('.birth-table').first().evaluate(table => ({
        columns: getComputedStyle(table.querySelector('tr')).gridTemplateColumns.split(' ').map(Number.parseFloat),
        headings: [...table.querySelectorAll('.birth-table__year strong')].map(element => Number.parseFloat(getComputedStyle(element).fontSize)),
        headerTimesAndYears: table.querySelectorAll('thead time, .birth-table__year > span').length,
        values: [...table.querySelectorAll('.birth-table__value')].map(element => ({
          size: Number.parseFloat(getComputedStyle(element).fontSize),
          weight: getComputedStyle(element).fontWeight,
          line: Number.parseFloat(getComputedStyle(element).lineHeight),
        })),
        chips: [...table.querySelectorAll('.ds-relation__chip')].map(element => element.getBoundingClientRect().height),
        dots: [...table.querySelectorAll('.ds-element__dot')].map(element => element.getBoundingClientRect().width),
        textSizes: [...new Set([...table.closest('.birth-page').querySelectorAll('*')]
          .filter(element => element.getClientRects().length && element.textContent.trim() && !element.closest('.visually-hidden'))
          .map(element => getComputedStyle(element).fontSize))],
      }));
      expect(birthLayout.columns[1]).toBe(96);
      expect(birthLayout.columns[0]).toBeCloseTo(birthLayout.columns[2], 1);
      expect(birthLayout.headings).toEqual([24, 24]);
      expect(birthLayout.headerTimesAndYears).toBe(0);
      expect(birthLayout.values).toHaveLength(10);
      for (const value of birthLayout.values) expect(value).toEqual({ size: 14, weight: '600', line: 21 });
      expect(birthLayout.chips).toEqual([20, 20, 20, 20, 20]);
      expect(birthLayout.dots).toEqual([7, 7, 7, 7, 7, 7, 7, 7, 7, 7]);
      expect(birthLayout.textSizes.length).toBeLessThanOrEqual(5);
      expect([...birthLayout.textSizes].sort()).toEqual(['12px', '14px', '15px', '24px']);
      await testInfo.attach('birth-layout-metrics', { body: JSON.stringify(birthLayout, null, 2), contentType: 'application/json' });
    }
    if (state.questionnaire) {
      await expectConstitutionSegments(state.constitutionResult ? page.getByRole('region', { name: '体质测评结果', exact: true }) : page);
      const typography = await expectTypeScale(page, testInfo, `${state.name}-constitution`);
      expect(typography.sizes.every(size => [12, 14, 15, 20, 24, 30, 40].includes(size))).toBe(true);
      const question = page.locator('.constitution-question-title');
      if (!state.constitutionResult && !state.constitutionLastQuestion) {
        const metrics = await question.evaluate(element => ({ size: getComputedStyle(element).fontSize, font: getComputedStyle(element).fontFamily }));
        expect(metrics.size).toBe('20px');
        expect(metrics.font).toContain('Noto Serif SC');
        await expectConstitutionAnswerLayout(page, testInfo);
        const options = await page.locator('.ds-scale-option').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
        expect(options).toHaveLength(5);
        for (const height of options) expect(height).toBeGreaterThanOrEqual(40);
        await page.getByRole('radiogroup').getByRole('radio').first().focus();
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('.constitution-position')).toHaveText('已答 5 / 26');
        await expect(page.locator('.constitution-position')).toHaveAttribute('aria-label', /当前第 5 题/);
        const focusedOption = page.getByRole('radiogroup').getByRole('radio').nth(1);
        await expect(focusedOption).toHaveCSS('outline-width', '2px');
        await expect(focusedOption).toHaveCSS('outline-style', 'solid');
      }
      if (state.constitutionResult) {
        await expectConstitutionResultLayout(page.getByRole('region', { name: '体质测评结果', exact: true }), testInfo);
      }
    }
    await screenshot(page, testInfo, state.name);

    const layout = await page.evaluate(() => {
      const visible = element => element.getClientRects().length > 0;
      const lineCount = element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size;
      };
      const measure = selector => [...document.querySelectorAll(selector)].filter(visible).map(element => ({
        text: element.getAttribute('aria-label') || element.textContent.trim(),
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        lines: lineCount(element),
      }));
      return {
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        overflowingControls: [...document.querySelectorAll('input, select, button')].filter(visible).filter(element => {
          const rect = element.getBoundingClientRect();
          return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1 || element.scrollWidth > element.clientWidth + 1;
        }).map(element => ({ tag: element.tagName, label: element.getAttribute('aria-label') || element.id || element.textContent.trim(), clientWidth: element.clientWidth, scrollWidth: element.scrollWidth })),
        yearSelect: measure('select[aria-label="分析年份"]'),
        inputHeight: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--input-height')),
        stageNames: measure('.drilldown-stage-selector__option strong'),
        stageTimes: measure('.drilldown-stage-selector__range time'),
        currentTitle: measure('.current-year-heading h3'),
        currentCards: measure('.current-overview__annual, .current-overview__now'),
        annualValues: measure('.current-annual-grid .ds-element > span:last-child, .drilldown-annual-facts .ds-element > span:last-child'),
        mainBounds: document.querySelector('main').getBoundingClientRect().toJSON(),
        cardBounds: [...document.querySelectorAll('.current-overview__annual, .current-overview__now')].map(element => element.getBoundingClientRect().toJSON()),
        viewportHeight: innerHeight,
      };
    });
    await testInfo.attach('layout-metrics', { body: JSON.stringify(layout, null, 2), contentType: 'application/json' });
    if (state.name === 'annual-entry' || state.name === 'annual-result') {
      expect.soft(layout.yearSelect, 'Annual page retains its year selection control').toHaveLength(1);
    }
    if (state.name === 'annual-result') {
      expect.soft(layout.stageNames, 'Annual result retains all six named stages').toHaveLength(6);
      expect.soft(layout.stageTimes, 'Every annual stage retains both boundary times').toHaveLength(12);
    }
    if (state.current) {
      expect.soft(layout.currentTitle, 'Annual ganzhi is the primary heading').toHaveLength(1);
      expect.soft(layout.currentCards, 'The default view retains both fact cards').toHaveLength(2);
      if (layout.viewportHeight >= 900) for (const card of layout.cardBounds) {
        expect.soft(card.top, 'Fact card starts inside the content viewport without scrolling').toBeGreaterThanOrEqual(layout.mainBounds.top);
        expect.soft(card.bottom, 'Annual and current cards fit without scrolling').toBeLessThanOrEqual(layout.mainBounds.bottom);
      }
    }
    expect.soft(layout.documentWidth, 'Page must not overflow horizontally').toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect.soft(layout.overflowingControls, 'Controls must fit and keep their content readable').toEqual([]);
    for (const control of layout.yearSelect) {
      expect.soft(Math.abs(control.height - layout.inputHeight), 'Year selector height equals the computed --input-height token (±1 px)').toBeLessThanOrEqual(1);
    }
    for (const name of layout.stageNames) expect.soft(name.lines, `Stage name remains readable: ${name.text}`).toBe(1);
    for (const time of layout.stageTimes) expect.soft(time.lines, `Stage time remains on one line: ${time.text}`).toBe(1);
    for (const value of layout.annualValues) expect.soft(value.lines, `Annual three-column values fit on one line: ${value.text}`).toBe(1);
    for (const title of layout.currentTitle) expect.soft(title.lines, 'Current heading fits on one line').toBe(1);
    await expectFocusRings(page, testInfo);

    const scan = await scanAccessibility(page);
    await testInfo.attach('axe-results', { body: JSON.stringify(scan, null, 2), contentType: 'application/json' });
    const violations = scan.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map(node => node.target),
    }));
    expect.soft(violations, 'No automatically detected WCAG A/AA violations; full details in axe-results').toEqual([]);
    if (state.name === 'current-stage-facts') {
      const summary = page.locator('.current-technical > summary');
      await summary.click();
      const card = page.getByRole('region', { name: '精确时刻', exact: true });
      await card.scrollIntoViewIfNeeded();
      const current = (await (await currentResponse).json()).data;
      for (const [group, count, active] of [['六步气', 6, current.facts.currentStep], ['五步运', 5, current.currentMovement]]) {
        const sequence = card.getByRole('region', { name: group });
        await expect(sequence.locator('ol > li')).toHaveCount(count);
        await expect(sequence.locator('[aria-current="step"]')).toContainText(`${active.name}当前`);
        await expect(sequence.locator('time').first()).toHaveCSS('font-family', /monospace/);
      }
      const rowsFit = await card.locator('ol > li').evaluateAll(rows => {
        const columns = [...rows[0].querySelectorAll('time')].map(time => time.getBoundingClientRect().left);
        return rows.every(row => {
          const label = row.querySelector('.calculation-sequence__label').getBoundingClientRect();
          const [start, end] = [...row.querySelectorAll('time')].map(time => time.getBoundingClientRect());
          return label.right <= start.left && start.top === end.top && row.scrollWidth <= row.clientWidth + 1
            && Math.abs(start.left - columns[0]) < 1 && Math.abs(end.left - columns[1]) < 1;
        });
      });
      expect(rowsFit).toBe(true);
      const headingLeft = (await card.locator('.ds-info-card__label').boundingBox()).x;
      for (const row of [page.getByRole('link', { name: '指定时点', exact: true }), summary]) {
        const textLeft = await row.evaluate(element => {
          const range = document.createRange();
          range.selectNodeContents(element.firstChild);
          return range.getBoundingClientRect().left;
        });
        expect(Math.abs(textLeft - headingLeft)).toBeLessThanOrEqual(1);
      }
      await screenshot(page, testInfo, 'current-calculation-timeline');
      expect((await scanAccessibility(page)).violations).toEqual([]);
    }
    if (state.name === 'birth-result') {
      await page.getByRole('button', { name: '这些关系怎么读？' }).click();
      const guide = page.locator('.birth-relation-details:visible');
      await expect(guide.getByRole('table', { name: '五维生克总览' }).getByRole('rowheader')).toHaveCount(5);
      await expect(guide.getByRole('link')).toHaveCount(0);
      await expect(guide.locator('.learning-source')).toHaveCount(1);
      await guide.locator('.learning-source').scrollIntoViewIfNeeded();
      await screenshot(page, testInfo, 'birth-relations-expanded');
      expect((await scanAccessibility(page)).violations).toEqual([]);
    }
  });
}

test('@visual constitution snapshot cards retain each element and the leap-day interval', async ({ page, acceptanceTheme }, testInfo) => {
  await page.goto('/yunqi/birth');
  await fillBirthDate(page, '1980-02-29');
  await page.getByRole('button', { name: '确认并对照', exact: true }).click();
  await page.getByRole('button', { name: '同时测评体质', exact: true }).click();
  if (acceptanceTheme === 'dark') await page.getByRole('button', { name: '切换至深色主题' }).click();
  const details = page.locator('.constitution-context-details');
  await details.locator('summary').click();
  await expect(details.getByRole('heading')).toHaveText(['当下快照', '先天快照']);
  const cards = details.locator('.constitution-snapshot');
  for (const card of await cards.all()) {
    await expect(card.locator('.constitution-snapshot__annual dt')).toHaveText(['岁运', '司天', '在泉']);
    await expect(card.locator('.constitution-snapshot__stages dd')).toHaveCount(4);
    await expect(card.locator('.ds-element__dot')).toHaveCount(7);
    await expect(card).toHaveCSS('background-image', /^linear-gradient/);
    const metrics = await card.locator('.constitution-snapshot__annual dd').evaluateAll(nodes => nodes.map(el => el.getBoundingClientRect().top));
    expect(new Set(metrics).size).toBe(1);
  }
  const birth = cards.last();
  await expect(birth.locator('.constitution-snapshot__badge')).toHaveText('当日已知时段归属一致');
  await expect(birth.locator('.constitution-snapshot__annual .ds-element__dot').first()).toHaveClass(/dot--metal/);
  await expect(birth.locator('time')).toHaveText(['02-29 00:00', '03-01 00:00']);
  await expect(birth.locator('time').first()).toHaveCSS('font-family', /monospace/);
  await details.scrollIntoViewIfNeeded();
  await screenshot(page, testInfo, 'constitution-snapshots-expanded');
  expect((await scanAccessibility(page)).violations).toEqual([]);
});
