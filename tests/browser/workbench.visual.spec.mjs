import AxeBuilder from '@axe-core/playwright';
import { test, expect, settle, screenshot, expectPanelLayout, expectTypeScale } from './fixtures.mjs';
import { answerConstitution, expectConstitutionResults } from './constitution-helpers.mjs';
import { expectFocusRings, expectViewControls } from './visual-assertions.mjs';

const cases = [
  { name: 'current', path: '/yunqi/current', current: true },
  { name: 'current-classics', path: '/yunqi/current/classics', classics: true },
  { name: 'annual-classics', path: '/yunqi/current/classics', classics: true, annualClassics: true },
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
  { name: 'birth-result', path: '/yunqi/birth', ready: '出生运气对照', birth: true },
  { name: 'birth-boundary', path: '/yunqi/birth', ready: '出生运气对照', birth: true, birthBoundary: true },
  { name: 'birth-classics', path: '/yunqi/birth', ready: '出生运气对照', birth: true, birthClassics: true },
  { name: 'birth-assessment', path: '/yunqi/birth', ready: '出生运气对照', birth: true, birthAssessment: true, questionnaire: true },
  { name: 'birth-assessment-complete', path: '/yunqi/birth', ready: '出生运气对照', birth: true, birthAssessment: true, questionnaire: true, constitutionComplete: true },
  { name: 'birth-assessment-result', path: '/yunqi/birth', ready: '出生运气对照', birth: true, birthAssessment: true, questionnaire: true, constitutionResult: true },
  { name: 'constitution-entry', path: '/yunqi/constitution', ready: '中医体质测评' },
  { name: 'constitution-questions', path: '/yunqi/constitution', ready: '中医体质测评', questionnaire: true },
  { name: 'constitution-complete', path: '/yunqi/constitution', ready: '中医体质测评', questionnaire: true, constitutionComplete: true },
  { name: 'constitution-result', path: '/yunqi/constitution', ready: '中医体质测评', questionnaire: true, constitutionResult: true },
  { name: 'not-found', path: '/yunqi/inquiry/new', ready: '页面未找到' },
];

for (const state of cases) {
  test(`@visual ${state.name}: screenshot, readable layout and accessibility`, async ({ page, acceptanceTheme, diagnostics }, testInfo) => {
    if (state.outage) {
      diagnostics.allowHttpFailure(state.outage, 503);
      await page.route(`**${state.outage}`, route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
    }
    await page.goto(state.path);
    if (state.current) await expect(page.getByRole('region', { name: '全年 · 2024' })).toBeVisible();
    else if (state.classics) {
      await expect(page.getByRole('group', { name: '原文范围' })).toBeVisible();
      if (state.annualClassics) await page.getByRole('button', { name: '全年', exact: true }).click();
    } else await expect(page.getByRole('main').getByRole('heading', { name: state.ready, exact: true })).toBeVisible();
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
      await page.getByLabel('出生日期（公历）').fill('1990-05-12');
      await page.getByRole('button', { name: '查看出生与当前运气' }).click();
      await expect(page.getByRole('region', { name: '出生与当前运气对照结果' })).toBeVisible();
      const { data } = await (await responsePromise).json();
      if (state.birthBoundary) {
        await page.getByLabel('出生日期（公历）').fill(data.current.facts.interval.start.localTime.slice(0, 10));
        const boundaryResponse = page.waitForResponse(response => response.url().endsWith('/learning/birth-comparison'));
        await page.getByRole('button', { name: '查看出生与当前运气' }).click();
        const { data: boundary } = await (await boundaryResponse).json();
        expect(boundary.ambiguous).toBe(true);
        await expect(page.locator('.birth-table')).toHaveCount(boundary.candidates.length);
      }
      if (state.birthClassics) {
        await page.getByRole('link', { name: '全部原文', exact: true }).click();
        await expect(page.getByRole('region', { name: '先天原文与释义', exact: true })).toBeVisible();
      }
    }
    if (state.birthAssessment) {
      await page.getByRole('button', { name: '同时测评体质', exact: true }).click();
    }
    if (state.questionnaire) {
      if (state.constitutionComplete || state.constitutionResult) {
        await answerConstitution(page);
        if (state.constitutionResult) {
          const scoreResponse = page.waitForResponse(response => response.url().endsWith('/constitution/assess'));
          await page.getByRole('button', { name: '查看结果', exact: true }).click();
          const { data } = await (await scoreResponse).json();
          await expectConstitutionResults(page, data);
        }
      } else {
        await page.getByRole('radio', { name: '男', exact: true }).check();
        await expect(page.locator('.constitution-question-screen')).toHaveCount(1);
        await expect(page.getByRole('radiogroup').getByRole('radio')).toHaveCount(5);
      }
    }
    if (acceptanceTheme === 'dark') {
      await page.getByRole('button', { name: '切换至深色主题', exact: true }).click();
      await expect(page.getByRole('button', { name: '切换至浅色主题', exact: true })).toBeVisible();
    }
    await settle(page);
    const panelLayout = await expectPanelLayout(page);
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
      expect(controls.primary.map(control => control.label)).toEqual(['查看出生与当前运气']);
      if (state.birthAssessment && state.constitutionComplete) await expect(page.getByRole('button', { name: '查看结果', exact: true })).toHaveClass(/ds-button--secondary/);
    }
    if (state.birthAssessment || state.name.startsWith('constitution')) {
      const destroy = page.getByRole('button', { name: '结束并销毁答卷', exact: true });
      await expect(destroy).toHaveCount(state.constitutionComplete || state.constitutionResult ? 1 : 0);
      if (state.constitutionComplete || state.constitutionResult) await expect(destroy).toHaveClass(/ds-button--secondary/);
      await expect(page.locator('footer.constitution-session-footer')).toHaveCount(1);
    }
    if (state.birth && !state.birthClassics) {
      const birthLayout = await page.locator('.birth-table').first().evaluate(table => ({
        columns: getComputedStyle(table.querySelector('tr')).gridTemplateColumns.split(' ').map(Number.parseFloat),
        headings: [...table.querySelectorAll('.birth-table__year strong')].map(element => Number.parseFloat(getComputedStyle(element).fontSize)),
        years: [...table.querySelectorAll('.birth-table__year > span')].map(element => Number.parseFloat(getComputedStyle(element).fontSize)),
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
      expect(birthLayout.columns[0]).toBe(52);
      expect(birthLayout.columns[1]).toBeCloseTo(birthLayout.columns[2], 1);
      expect(birthLayout.headings).toEqual([24, 24]);
      expect(birthLayout.years).toEqual([14, 14]);
      expect(birthLayout.values).toHaveLength(10);
      for (const value of birthLayout.values) expect(value).toEqual({ size: 14, weight: '600', line: 21 });
      expect(birthLayout.chips).toEqual([20, 20, 20, 20, 20]);
      expect(birthLayout.dots).toEqual([7, 7, 7, 7, 7, 7]);
      if (!state.birthAssessment) {
        expect(birthLayout.textSizes.length).toBeLessThanOrEqual(5);
        expect([...birthLayout.textSizes].sort()).toEqual(['12px', '14px', '15px', '24px']);
      }
      await testInfo.attach('birth-layout-metrics', { body: JSON.stringify(birthLayout, null, 2), contentType: 'application/json' });
    }
    if (state.questionnaire) {
      const typography = await expectTypeScale(page, testInfo, `${state.name}-constitution`);
      expect(typography.sizes.every(size => [12, 14, 15, 20, 24, 30, 40].includes(size))).toBe(true);
      const question = page.locator('.constitution-question-title');
      if (!state.constitutionResult && !state.constitutionComplete) {
        const metrics = await question.evaluate(element => ({ size: getComputedStyle(element).fontSize, font: getComputedStyle(element).fontFamily }));
        expect(metrics.size).toBe('20px');
        expect(metrics.font).toContain('Noto Serif SC');
        const progress = await page.locator('.constitution-progress-grid').evaluate(element => ({
          columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
          rows: getComputedStyle(element).gridTemplateRows.split(' ').length,
          cells: element.children.length,
        }));
        expect(progress).toEqual({ columns: 13, rows: 2, cells: 26 });
        const options = await page.locator('.ds-scale-option').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
        expect(options).toHaveLength(5);
        for (const height of options) expect(height).toBeGreaterThanOrEqual(40);
        await page.getByRole('radiogroup').getByRole('radio').first().focus();
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('.constitution-position')).toHaveText('1/26');
        const focusedOption = page.getByRole('radiogroup').getByRole('radio').nth(1);
        await expect(focusedOption).toHaveCSS('outline-width', '2px');
        await expect(focusedOption).toHaveCSS('outline-style', 'solid');
      }
      if (state.constitutionResult) {
        expect(await page.locator('.constitution-decision h4').evaluate(element => getComputedStyle(element).fontSize)).toBe('30px');
        await expect(page.locator('.constitution-bar-track[role="img"]')).toHaveCount(9);
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
    if (state.name === 'current') {
      expect.soft(layout.currentTitle, 'Annual ganzhi is the primary heading').toHaveLength(1);
      expect.soft(layout.currentCards, 'The default view retains both fact cards').toHaveLength(2);
      if (layout.viewportHeight >= 900) for (const card of layout.cardBounds) {
        expect.soft(card.top, 'Fact card starts inside the content viewport without scrolling').toBeGreaterThanOrEqual(layout.mainBounds.top);
        expect.soft(card.bottom, 'Annual and current cards fit without scrolling').toBeLessThanOrEqual(layout.mainBounds.bottom);
      }
    }
    expect.soft(layout.documentWidth, 'Page must not overflow horizontally').toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect.soft(layout.overflowingControls, 'Controls must fit and keep their content readable').toEqual([]);
    for (const control of layout.yearSelect) expect.soft(control.height, 'Year selector meets the design control-height token (40 px)').toBeGreaterThanOrEqual(40);
    for (const name of layout.stageNames) expect.soft(name.lines, `Stage name remains readable: ${name.text}`).toBe(1);
    for (const time of layout.stageTimes) expect.soft(time.lines, `Stage time remains on one line: ${time.text}`).toBe(1);
    for (const value of layout.annualValues) expect.soft(value.lines, `Annual three-column values fit on one line: ${value.text}`).toBe(1);
    for (const title of layout.currentTitle) expect.soft(title.lines, 'Current heading fits on one line').toBe(1);
    await expectFocusRings(page, testInfo);

    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    await testInfo.attach('axe-results', { body: JSON.stringify(scan, null, 2), contentType: 'application/json' });
    const violations = scan.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map(node => node.target),
    }));
    expect.soft(violations, 'No automatically detected WCAG A/AA violations; full details in axe-results').toEqual([]);
  });
}
