import { test, expect, loadCurrent, scanAccessibility, waitForAnimations, screenshot, expectNoPersonalDataInUrl } from './fixtures.mjs';
import { fillBirthDate, expectBirthComparison } from './birth-helpers.mjs';
import { confirmConstitutionDestruction, expectConstitutionResults } from './constitution-helpers.mjs';
import { expectedMotionLevel, expectMotionDurations } from './motion-helpers.mjs';

const ANSWER_HOLD_MS = 240;

test('edition watermark responds to hover according to the motion setting', async ({ page, motionMode }) => {
  const editions = page.getByRole('radiogroup', { name: '量表所用性别' });
  async function checkHover(level) {
    await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', level);
    const cards = editions.getByRole('radio');
    await expect(cards).toHaveCount(2);
    for (const card of await cards.all()) {
      const watermark = card.locator('.constitution-edition-art svg');
      await expect(watermark).toHaveCSS('transform', 'none');
      if (level === 'full') await expect(watermark).toHaveCSS('transition-property', 'transform');
      await card.hover();
      await expect(watermark).toHaveCSS('transform', level === 'full' ? 'matrix(1.1, 0, 0, 1.1, -4, 2)' : 'none');
      await page.mouse.move(0, 0);
      await expect(watermark).toHaveCSS('transform', 'none');
    }
  }
  await page.goto('/yunqi/constitution');
  await checkHover(expectedMotionLevel(motionMode));
  if (motionMode === 'reduced') {
    await page.getByRole('link', { name: '当下运气', exact: true }).click();
    await page.getByText('动效设置', { exact: true }).click();
    await page.getByRole('radio', { name: '标准', exact: true }).click();
    await page.getByRole('link', { name: '体质量表', exact: true }).click();
    await checkHover('full');
  }
});

async function activate(page, target, input, key = 'Enter') {
  if (input === 'mouse') await target.click();
  else { await target.focus(); await page.keyboard.press(key); }
}

async function observeResult(page) {
  await page.evaluate(() => {
    window.resultShiftObserver?.disconnect();
    window.resultEntryObserver?.disconnect();
    window.resultShifts = [];
    window.resultReveal = undefined;
    window.resultPaintBoundary = Number.POSITIVE_INFINITY;
    window.resultShiftObserver = new PerformanceObserver(list => {
      window.resultShifts.push(...list.getEntries().map(entry => ({ value: entry.value, start: entry.startTime, recentInput: entry.hadRecentInput })));
    });
    window.resultShiftObserver.observe({ type: 'layout-shift' });
    window.resultEntryObserver = new MutationObserver(() => {
      const result = document.querySelector('.constitution-result-view[data-reveal="true"]');
      if (!result || window.resultReveal) return;
      // Force initial style resolution while the submit-only marker is live.
      result.getBoundingClientRect();
      window.resultReveal = {
        animations: result.getAnimations({ subtree: true }).map(animation => ({
          target: animation.effect.target.className,
          duration: Number(animation.effect.getTiming().duration),
          delay: animation.effect.getTiming().delay,
          end: Number(animation.effect.getComputedTiming().endTime),
          frames: animation.effect.getKeyframes(),
        })),
        guides: [...result.querySelectorAll('.constitution-chart-guide')].map(guide => ({ transform: getComputedStyle(guide).transform, animations: guide.getAnimations().length })),
        labels: [...result.querySelectorAll('.constitution-bar-label')].map(label => label.textContent),
      };
      // The scoring response replaces the pending view and its shell header.
      // Keep those commit entries in the artifact; measure reveal stability
      // after its first paint, before the 60ms bar sequence begins. Do not
      // exclude recent-input entries from the animation's own shift sum.
      // Use the callback's own clock, not the rAF frame timestamp: on a loaded
      // runner that vsync time can predate the commit frame's layout, which
      // would misfile the commit's own shift as post-paint.
      requestAnimationFrame(() => requestAnimationFrame(() => { window.resultPaintBoundary = performance.now(); }));
    });
    window.resultEntryObserver.observe(document.querySelector('main'), { childList: true, subtree: true, attributes: true });
  });
}

async function expectReveal(page, motionMode, testInfo, name) {
  await waitForAnimations(page);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const sample = await page.evaluate(() => {
    window.resultShiftObserver.disconnect();
    window.resultEntryObserver.disconnect();
    return { reveal: window.resultReveal, shifts: window.resultShifts, paintBoundary: window.resultPaintBoundary };
  });
  await testInfo.attach(name, { body: JSON.stringify(sample), contentType: 'application/json' });
  expect(Number.isFinite(sample.paintBoundary)).toBe(true);
  expect(sample.shifts.filter(shift => shift.start >= sample.paintBoundary).reduce((total, shift) => total + shift.value, 0), 'No layout shift after result entry paint, including input-associated shifts').toBe(0);
  expect(sample.reveal.labels).toEqual(['平和', '气虚', '阳虚', '阴虚', '痰湿', '湿热', '血瘀', '气郁', '特禀']);
  expect(sample.reveal.guides).toEqual(Array(2).fill({ transform: 'none', animations: 0 }));
  const animations = sample.reveal.animations;
  expect(Math.max(0, ...animations.map(animation => animation.end))).toBeLessThanOrEqual(motionMode === 'full' ? 400 : motionMode === 'off' ? 0 : 120);
  if (motionMode === 'full') {
    const bars = animations.filter(animation => animation.target === 'constitution-bar-fill');
    // WAAPI converts CSS seconds to milliseconds (e.g. 150.00000000000003).
    expect(bars.map(bar => Math.round(bar.delay))).toEqual(Array.from({ length: 9 }, (_, index) => 60 + index * 20));
    expect(bars.map(bar => bar.duration)).toEqual(Array(9).fill(180));
    expect(bars.at(-1).end).toBe(400);
    expect(bars.every(bar => bar.frames.some(frame => frame.transform === 'scaleX(0)'))).toBe(true);
    expect(bars.every(bar => bar.frames.every(frame => !('width' in frame)))).toBe(true);
    expect(animations.filter(animation => animation.target === 'constitution-bar-score num').map(animation => animation.delay)).toEqual(bars.map(bar => bar.delay));
    expect(animations.filter(animation => animation.target === 'constitution-bar-score num').map(animation => animation.duration)).toEqual(Array(9).fill(180));
    expect(animations.find(animation => animation.target.includes('constitution-decision'))).toMatchObject({ delay: 0, duration: 180 });
    expect(animations.find(animation => animation.target.includes('constitution-reference-card'))).toMatchObject({ delay: 240, duration: 120 });
  } else if (motionMode === 'off') expect(animations).toEqual([]);
  else {
    expect(animations).toHaveLength(1);
    expect(animations[0]).toMatchObject({ target: 'constitution-result-view', duration: 120, delay: 0 });
    expect(animations[0].frames.every(frame => !('transform' in frame))).toBe(true);
  }
}

for (const input of ['keyboard', 'mouse']) for (const embedded of [false, true]) {
  test(`M1-c F/G/H/I ${input} ${embedded ? 'embedded' : 'standalone'} preserves answers, focus and memory-only results`, async ({ page, motionMode, diagnostics }, testInfo) => {
    await loadCurrent(page);
    const tab = embedded ? '先天对照' : '体质量表';
    const path = embedded ? '/yunqi/birth' : '/yunqi/constitution';
    await activate(page, page.getByRole('link', { name: tab, exact: true }), input);
    await expect(page).toHaveURL(new RegExp(`${path}(?:\\?motion=off)?$`));
    if (embedded) {
      await fillBirthDate(page, '1990-05-12');
      const response = page.waitForResponse(item => item.url().endsWith('/learning/birth-comparison'));
      await activate(page, page.getByRole('button', { name: '确认并对照', exact: true }), input);
      await expectBirthComparison(page, (await (await response).json()).data);
      await activate(page, page.getByRole('button', { name: '同时测评体质', exact: true }), input);
    }
    const scope = page.locator(embedded ? '.birth-session' : '.constitution-page');
    const form = scope.getByRole('form', { name: '中医体质量表', exact: true });
    await expect(scope.getByRole('form')).toBeVisible();
    const storage = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
    await activate(page, scope.getByRole('radio', { name: '男性量表', exact: true }), input, 'Space');
    await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', expectedMotionLevel(motionMode));
    let score;
    for (let number = 1; number <= 26; number += 1) {
      await expect(form.locator('.constitution-position')).toHaveAttribute('aria-label', new RegExp(`当前第 ${number} 题`));
      if (number === 2) {
        if (input === 'keyboard') await page.keyboard.press('ArrowLeft');
        else await scope.getByRole('button', { name: '上一题', exact: true }).click();
        await expect(scope.locator('.constitution-question-screen')).toHaveAttribute('data-direction', 'backward');
        await expect(scope.getByRole('radio', { name: '1 没有（根本不）', exact: true })).toBeChecked();
        if (input === 'keyboard') await page.keyboard.press('1');
        else await scope.getByRole('radio', { name: '1 没有（根本不）', exact: true }).click();
        await expect(form.locator('.constitution-position')).toHaveAttribute('aria-label', /当前第 2 题/);
      }
      if (number === 3) {
        await activate(page, page.getByRole('link', { name: '当下运气', exact: true }), input);
        await expect(page).toHaveURL(/\/yunqi\/current(?:\?motion=off)?$/);
        await expect(page).toHaveTitle('当下运气 · 运气通');
        await expect(page.getByRole('button', { name: '结束并销毁', exact: true })).toHaveCount(0);
        await activate(page, page.getByRole('link', { name: '体质量表', exact: true }), input);
        await expect(page).toHaveURL(/\/yunqi\/constitution(?:\?motion=off)?$/);
        await expect(form.locator('.constitution-position')).toHaveText('已答 2 / 26');
        // Tab navigation intentionally focuses main. Re-enter the retained
        // question before continuing its local numeric shortcuts.
        if (input === 'keyboard') {
          const option = scope.getByRole('radio', { name: '1 没有（根本不）', exact: true });
          for (let tabs = 0; tabs < 30 && !await option.evaluate(element => element === document.activeElement); tabs += 1) await page.keyboard.press('Tab');
          await expect(option).toBeFocused();
        }
      }
      if (number === 26) {
        await observeResult(page);
        score = page.waitForResponse(response => response.url().endsWith('/constitution/assess'));
      }
      const value = (number - 1) % 5 + 1;
      if (input === 'keyboard') await page.keyboard.press(String(value));
      else await scope.getByRole('radio', { name: new RegExp(`^${value} `) }).click();
    }
    const actions = page.locator('.panel-shell__actions');
    const assessment = (await (await score).json()).data;
    const result = await expectConstitutionResults(page, assessment, scope);
    await expect(scope.locator('.constitution-decision h4')).toBeFocused();
    await expectReveal(page, motionMode, testInfo, 'first-submit-reveal');
    await expectMotionDurations(page, testInfo, 'M1-c-result-durations');
    const finalAnswer = (26 - 1) % 5 + 1;
    await activate(page, actions.getByRole('button', { name: '返回修改', exact: true }), input);
    await expect(scope.locator('.constitution-question-title')).toBeFocused();
    await expect(form.locator('.constitution-position')).toHaveAttribute('aria-label', /当前第 26 题/);
    await expect(scope.getByRole('radio', { name: new RegExp(`^${finalAnswer} `) })).toBeChecked();
    await observeResult(page);
    const secondScore = page.waitForResponse(response => response.url().endsWith('/constitution/assess'));
    if (input === 'keyboard') await page.keyboard.press(String(finalAnswer));
    else await scope.getByRole('radio', { name: new RegExp(`^${finalAnswer} `) }).click();
    expect((await (await secondScore).json()).data).toEqual(assessment);
    await expect(result).toBeVisible();
    await expectReveal(page, motionMode, testInfo, 'resubmit-reveal');
    // The result header replaces the tabs. Native history leaves the result;
    // returning via its tab must recover the same in-memory result silently.
    await page.goBack();
    await expect(page).toHaveURL(/\/yunqi\/current(?:\?motion=off)?$/);
    await expect(page.getByRole('region', { name: '体质测评结果', exact: true })).toHaveCount(0);
    await activate(page, page.getByRole('link', { name: '体质量表', exact: true }), input);
    await expect(page).toHaveURL(/\/yunqi\/constitution(?:\?motion=off)?$/);
    await expect(page).toHaveTitle('体质测评结果 · 运气通');
    await expect(result).toBeVisible();
    await expect(result).toHaveAttribute('data-reveal', 'false');
    expect(diagnostics.requests.filter(request => request.url.endsWith('/constitution/assess'))).toHaveLength(2);
    const scan = await scanAccessibility(page);
    expect(scan.violations).toEqual([]);
    if (motionMode === 'off') await screenshot(page, testInfo, `M1-c-${input}-${embedded ? 'embedded' : 'standalone'}-result`);
    await activate(page, actions.getByRole('button', { name: '结束并销毁', exact: true }), input);
    await confirmConstitutionDestruction(page, input === 'keyboard');
    await expect(scope.getByRole('radio', { name: '男性量表', exact: true })).toBeFocused();
    await expect(scope.getByRole('region', { name: '体质测评结果', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }))).toEqual(storage);
    expect(new URL(page.url()).pathname).toBe('/yunqi/constitution');
    expectNoPersonalDataInUrl(page, motionMode);
    expect(new URL(page.url()).hash).toBe('');
    await expectMotionDurations(page, testInfo, 'M1-c-destroy-durations');
    expect((await scanAccessibility(page)).violations).toEqual([]);
  });
}

test('M1-c off advances, reverses, edits and destroys within the hold plus 50ms without animation events', async ({ page }, testInfo) => {
  await page.goto('/yunqi/constitution?motion=off');
  await page.getByRole('radio', { name: '男性量表', exact: true }).click();
  const budget = ANSWER_HOLD_MS + 50;
  const samples = {};
  async function timed(trigger) {
    const elapsed = await page.evaluate(({ trigger, deadline }) => new Promise((resolve, reject) => {
      const before = document.querySelector('.constitution-question-title')?.textContent;
      const started = performance.now();
      const done = () => trigger === 'destroy'
        ? document.querySelector('.constitution-sex button') !== null
        : document.querySelector('.constitution-question-title')?.textContent !== before;
      const observer = new MutationObserver(() => {
        if (!done()) return;
        observer.disconnect(); clearTimeout(timer); resolve(performance.now() - started);
      });
      observer.observe(document.querySelector('main'), { subtree: true, childList: true, attributes: true, characterData: true });
      // Generous watchdog only: the budget is asserted on the median below.
      const timer = setTimeout(() => { observer.disconnect(); reject(new Error(`${trigger} did not complete within ${deadline}ms`)); }, deadline);
      // Real key presses are cancelable; the handled key's preventDefault()
      // must stop later listeners exactly as it does for a user.
      const key = { key: trigger === 'answer' ? '1' : 'Backspace', bubbles: true, cancelable: true };
      if (trigger === 'answer' || trigger === 'previous') document.querySelector('.constitution-question-title').dispatchEvent(new KeyboardEvent('keydown', key));
      else [...document.querySelectorAll('button')].find(button => button.textContent.trim() === (trigger === 'destroy' ? '确认销毁' : '‹ 返回修改')).click();
    }), { trigger, deadline: 2000 });
    (samples[trigger] ??= []).push(elapsed);
  }
  // Each action is sampled three times; the median must stay within the hold
  // plus 50ms. One sample delayed by shared-runner scheduling cannot fail the
  // budget, while a real regression moves the median.
  function expectMedian(trigger) {
    const sorted = [...samples[trigger]].sort((left, right) => left - right);
    expect(sorted, `${trigger} samples`).toHaveLength(3);
    expect(sorted[1], `${trigger} median of ${sorted.map(value => Math.round(value)).join(', ')}ms`).toBeLessThanOrEqual(budget);
  }
  const position = page.getByRole('form', { name: '中医体质量表', exact: true }).locator('.constitution-position');
  for (let number = 1; number <= 3; number += 1) {
    await expect(position).toHaveAttribute('aria-label', new RegExp(`当前第 ${number} 题`));
    await timed('answer');
  }
  for (let number = 4; number >= 2; number -= 1) {
    await expect(position).toHaveAttribute('aria-label', new RegExp(`当前第 ${number} 题`));
    await timed('previous');
  }
  for (let number = 1; number <= 26; number += 1) {
    await expect(position).toHaveAttribute('aria-label', new RegExp(`当前第 ${number} 题`));
    await page.keyboard.press('1');
  }
  const result = page.getByRole('region', { name: '体质测评结果', exact: true });
  await expect(result).toBeVisible();
  for (let round = 0; round < 3; round += 1) {
    await timed('edit');
    await expect(position).toHaveAttribute('aria-label', /当前第 26 题/);
    if (round < 2) {
      // Editing returns to the last question; re-answering it scores the edited answers.
      await page.keyboard.press('1');
      await expect(result).toBeVisible();
    }
  }
  for (let round = 0; round < 3; round += 1) {
    if (round > 0) {
      await page.getByRole('radio', { name: '男性量表', exact: true }).click();
      await expect(position).toHaveAttribute('aria-label', /当前第 1 题/);
      await page.keyboard.press('1');
      await expect(position).toHaveAttribute('aria-label', /当前第 2 题/);
    }
    await page.getByRole('button', { name: '结束并销毁', exact: true }).click();
    await timed('destroy');
    await expect(page.getByRole('radio', { name: '男性量表', exact: true })).toBeFocused();
  }
  await testInfo.attach('M1-c-off-timing-samples', { body: JSON.stringify({ budget, samples }), contentType: 'application/json' });
  for (const trigger of ['answer', 'previous', 'edit', 'destroy']) expectMedian(trigger);
  await expectMotionDurations(page);
});

test('M1-c selected state is immediate, full dots stagger and editable shortcuts stay local', async ({ page, motionMode }, testInfo) => {
  await page.goto('/yunqi/constitution');
  await page.getByRole('radio', { name: '男性量表', exact: true }).click();
  const immediate = await page.evaluate(async () => {
    document.querySelector('.constitution-question-title').dispatchEvent(new KeyboardEvent('keydown', { key: '5', bubbles: true }));
    await new Promise(resolve => queueMicrotask(resolve));
    const option = document.querySelector('.ds-scale-option[aria-checked="true"]');
    return { checked: option?.dataset.shortcut, dots: [...option.querySelectorAll('[data-filled="true"]')].map(dot => ({ delay: Number.parseFloat(getComputedStyle(dot).animationDelay) * 1000, duration: Number.parseFloat(getComputedStyle(dot).animationDuration) * 1000 })) };
  });
  expect(immediate.checked).toBe('5');
  if (motionMode === 'full') expect(immediate.dots).toEqual(Array.from({ length: 5 }, (_, index) => ({ delay: index * 24, duration: 120 })));
  else expect(immediate.dots.every(dot => dot.duration === 0)).toBe(true);
  await expectMotionDurations(page, testInfo, 'M1-c-dot-durations');
  await expect(page.getByRole('form', { name: '中医体质量表', exact: true }).locator('.constitution-position')).toHaveAttribute('aria-label', /当前第 2 题/);
  const untouched = await page.evaluate(() => {
    const screen = document.querySelector('.constitution-question-screen');
    const input = document.createElement('input'); screen.append(input); input.focus();
    const keys = ['ArrowLeft', 'Backspace', '3'];
    const defaults = keys.map(key => input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
    input.remove();
    document.querySelector('.constitution-question-title').focus();
    return { defaults, position: document.querySelector('.constitution-position').getAttribute('aria-label') };
  });
  expect(untouched.defaults).toEqual([true, true, true]);
  expect(untouched.position).toMatch(/当前第 2 题/);
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('radio', { name: '5 总是（非常）', exact: true })).toBeChecked();
  await expect(page.locator('.constitution-question-title')).toHaveCSS('outline-style', 'none');
});
