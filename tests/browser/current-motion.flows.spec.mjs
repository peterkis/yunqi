import { test, expect, loadCurrent, waitForAnimations, scanAccessibility, expectTypeScale } from './fixtures.mjs';
import { expectBirthComparison, fillBirthDate } from './birth-helpers.mjs';
import { expectMotionDurations, expectedMotionLevel, observeOffAction } from './motion-helpers.mjs';

async function tabTo(page, target) {
  for (let step = 0; step < 80; step += 1) {
    if (await target.evaluate(element => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target, 'Reachable by Tab without programmatic focus').toBeFocused();
}
async function activate(page, target, input) {
  if (input === 'mouse') await target.click();
  else { await tabTo(page, target); await page.keyboard.press('Enter'); }
}

test('M1-d A reserves the wheel from first paint with zero layout shift and draws once per session', async ({ page, motionMode }, testInfo) => {
  await page.addInitScript(() => {
    window.currentShifts = [];
    window.currentPaints = [];
    window.currentShiftObserver = new PerformanceObserver(list => window.currentShifts.push(...list.getEntries().map(entry => ({ value: entry.value, recent: entry.hadRecentInput }))));
    window.currentShiftObserver.observe({ type: 'layout-shift', buffered: true });
    new MutationObserver(() => {
      const svg = document.querySelector('.current-year-wheel svg');
      if (!svg || window.currentPaints.length) return;
      window.currentPaints.push({ animations: svg.getAnimations({ subtree: true }).map(animation => ({
        duration: animation.effect.getTiming().duration, frames: animation.effect.getKeyframes(),
      })), center: document.querySelector('.current-year-heading').getAnimations().length });
    }).observe(document, { childList: true, subtree: true });
  });
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route('**/api/v1/yunqi/learning/current', async route => {
    const response = await route.fetch();
    await held;
    await route.fulfill({ response });
  });
  try {
    await page.goto('/yunqi/current');
    const reserved = page.locator('.current-loading .current-year-wheel');
    await expect(reserved).toBeVisible();
    await waitForAnimations(page);
    const before = await reserved.boundingBox();
    expect(before.width).toBe(220);
    expect(before.height).toBe(220);
    const response = page.waitForResponse(item => item.url().endsWith('/learning/current'));
    release();
    expect((await response).status()).toBe(200);
    await expect(page.locator('.current-year-wheel svg')).toBeVisible();
    await waitForAnimations(page);
    const after = await page.locator('.current-year-wheel').boundingBox();
    expect(after).toEqual(before);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const paint = await page.evaluate(() => {
      window.currentShiftObserver.disconnect();
      return { shifts: window.currentShifts, paints: window.currentPaints, marked: sessionStorage.getItem('yunqi-wheel-drawn') };
    });
    await testInfo.attach('M1-d-first-paint', { body: JSON.stringify({ mode: motionMode, before, after, ...paint }), contentType: 'application/json' });
    expect(paint.shifts.reduce((sum, shift) => sum + shift.value, 0), 'All first-screen shifts, including recent input').toBe(0);
    expect(paint.marked).toBe('true');
    expect(paint.paints[0].center).toBe(0);
    if (motionMode === 'full') {
      expect(paint.paints[0].animations.map(animation => animation.duration)).toEqual([320, 320]);
      expect(paint.paints[0].animations.every(animation => Number.parseFloat(animation.frames[0].strokeDashoffset) === 1 && Number.parseFloat(animation.frames.at(-1).strokeDashoffset) === 0)).toBe(true);
    } else expect(paint.paints[0].animations).toEqual([]);
    await expectMotionDurations(page, testInfo, 'M1-d-first-paint-durations');
    expect((await scanAccessibility(page)).violations).toEqual([]);
    await page.reload();
    await expect(page.locator('.current-year-wheel svg')).toBeVisible();
    await waitForAnimations(page);
    expect(await page.evaluate(() => window.currentPaints[0].animations)).toEqual([]);
  } finally { release(); }
});

for (const input of ['keyboard', 'mouse']) {
  test(`M1-d D/E/J ${input} submits, edits, pre-fills the birth context, clears and toggles in one step`, async ({ page, motionMode, diagnostics }, testInfo) => {
    await loadCurrent(page);
    await activate(page, page.getByRole('link', { name: '先天对照', exact: true }), input);
    await expect(page).toHaveURL(/\/yunqi\/birth(?:\?motion=off)?$/);
    await expect(page.getByRole('textbox', { name: '年龄', exact: true })).toBeFocused();
    let birth;
    for (const year of ['1990', '1991']) {
      if (input === 'keyboard') {
        await page.getByRole('radio', { name: '按出生年份' }).click();
        const yearInput = page.getByRole('textbox', { name: '年', exact: true });
        await tabTo(page, yearInput);
        await page.keyboard.press('ControlOrMeta+A');
        await page.keyboard.type(year);
        await expect(page.getByRole('textbox', { name: '月', exact: true })).toBeFocused();
        await page.keyboard.press('ControlOrMeta+A');
        await page.keyboard.type('05');
        await expect(page.getByRole('textbox', { name: '日', exact: true })).toBeFocused();
        await page.keyboard.press('ControlOrMeta+A');
        await page.keyboard.type('12');
      } else await fillBirthDate(page, `${year}-05-12`);
      const response = page.waitForResponse(item => item.url().endsWith('/learning/birth-comparison'));
      await expect(page.getByRole('button', { name: '确认并对照' })).toBeEnabled();
      if (input === 'keyboard') await page.keyboard.press('Enter');
      else await activate(page, page.getByRole('button', { name: '确认并对照', exact: true }), input);
      birth = (await (await response).json()).data;
      await expectBirthComparison(page, birth);
      await expectMotionDurations(page, testInfo, `M1-d-${input}-${year}`);
      if (year === '1990') {
        await activate(page, page.getByRole('button', { name: '修改', exact: true }), input);
        await expect(page.getByRole('textbox', { name: '年', exact: true })).toBeFocused();
        await expect(page.getByRole('textbox', { name: '年', exact: true })).toHaveValue('1990');
      }
    }
    const postsBefore = diagnostics.requests.filter(request => request.url.endsWith('/learning/birth-comparison'));
    expect(postsBefore.map(request => JSON.parse(request.body))).toEqual([{ birthDate: '1990-05-12' }, { birthDate: '1991-05-12' }]);
    await activate(page, page.getByRole('button', { name: '同时测评体质', exact: true }), input);
    await expect(page.getByRole('heading', { name: '本次体质测评', exact: true })).toBeFocused();
    const context = page.getByRole('complementary', { name: '本次测评对照背景', exact: true });
    const birthRow = context.locator('.constitution-context-rows > div').filter({ has: page.getByText('先天', { exact: true }) });
    const candidate = birth.candidates[0].learning.facts;
    await expect(birthRow.locator('dd')).toHaveText(`${candidate.stemBranch.ganzhi} · ${candidate.currentStep.name} · 客气${candidate.currentStep.guestQi}`);
    await expect(context.getByRole('link', { name: /未填写/ })).toHaveCount(0);
    expect(diagnostics.requests.filter(request => request.url.endsWith('/learning/birth-comparison'))).toHaveLength(2);
    await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', expectedMotionLevel(motionMode));
    expect((await scanAccessibility(page)).violations).toEqual([]);
    const collapse = page.getByRole('button', { name: '收起为胶囊条', exact: true });
    if (motionMode === 'off') await observeOffAction(page, '[aria-label="收起为胶囊条"]', '.panel-pill');
    await activate(page, collapse, input);
    if (motionMode === 'off') expect(await page.evaluate(() => window.motionActionTime)).toBeLessThanOrEqual(290);
    const pill = page.getByRole('button', { name: /^展开运气通/ });
    await expect(pill).toBeFocused();
    await expectMotionDurations(page, testInfo, `M1-d-${input}-pill`);
    await activate(page, pill, input);
    await expect(collapse).toBeFocused();
    await waitForAnimations(page);
    await expect(birthRow.locator('dd')).toHaveText(`${candidate.stemBranch.ganzhi} · ${candidate.currentStep.name} · 客气${candidate.currentStep.guestQi}`);
    await activate(page, page.getByRole('link', { name: '先天对照', exact: true }), input);
    await activate(page, page.getByRole('button', { name: '清空本次资料', exact: true }), input);
    await expect(page.getByRole('textbox', { name: '年', exact: true })).toBeFocused();
    await expect(page.getByRole('textbox', { name: '年', exact: true })).toHaveValue('');
    await expect(page.getByRole('status')).toHaveText('已清空本次资料');
    await expect(page.getByRole('region', { name: '出生与当前运气对照结果', exact: true })).toHaveCount(0);
    await expect(page.getByRole('form', { name: '中医体质量表', exact: true })).toHaveCount(0);
    await expectTypeScale(page, testInfo, `M1-d-${input}-cleared`);
    expect((await scanAccessibility(page)).violations).toEqual([]);
  });
}

test('M1-d open current view crossfades only changed rings on real Service snapshot refresh', async ({ page, motionMode, diagnostics }, testInfo) => {
  // Install before navigation so the existing query interval uses this clock.
  // This only advances browser timers/cache time, never the Service clock or
  // API localTime. Keep WAAPI running naturally for the animation assertions.
  await page.clock.install();
  // Same real calculation replay as stage-facts-helpers, without fabricating
  // DTO fields. Each existing 60s poll receives a real calculated snapshot.
  let dateTime = '2026-11-18T08:44:00+08:00';
  await page.route('**/api/v1/yunqi/learning/current', async route => {
    const response = await route.fetch({ url: new URL('/api/v1/yunqi/learning/calculate', route.request().url()).href, method: 'POST', postData: { dateTime } });
    expect(response.status()).toBe(200);
    await route.fulfill({ response });
  });
  const first = page.waitForResponse(item => item.url().endsWith('/learning/current'));
  await page.goto('/yunqi/current');
  let old = (await (await first).json()).data;
  expect(old.facts.input.localTime).toBe(dateTime);
  await expect(page.locator('.current-year-wheel svg')).toBeVisible();
  await waitForAnimations(page);
  await page.evaluate(() => {
    window.wheelRefreshes = [];
    new MutationObserver(() => {
      const svg = document.querySelector('.current-year-wheel svg');
      window.wheelRefreshes.push({
        qi: Number(svg.querySelector('[data-ring="qi"] .is-current').dataset.index),
        movement: Number(svg.querySelector('[data-ring="movement"] .is-current').dataset.index),
        animations: svg.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').map(animation => ({
          duration: animation.effect.getTiming().duration, frames: animation.effect.getKeyframes(),
        })),
        titles: [...document.querySelectorAll('.current-period-cell--title')].map(element => element.dataset.emphasized),
      });
    }).observe(document.querySelector('main'), { childList: true, subtree: true, attributes: true });
  });
  const ariaLiveCount = await page.locator('[aria-live]').count();
  for (const time of ['2026-11-23T12:00:00+08:00', '2027-01-21T12:00:00+08:00']) {
    dateTime = time;
    const response = page.waitForResponse(item => item.url().endsWith('/learning/current'));
    // useLearningCurrentQuery polls every 60s while visible. Focus refetch is
    // disabled by QueryProvider, so visibilitychange is not a refresh path.
    await page.clock.fastForward(60_000);
    const delivered = await response;
    expect(delivered.status()).toBe(200);
    const next = (await delivered.json()).data;
    expect(next.facts.input.localTime).toBe(time);
    const qi = next.facts.currentStep.index;
    const movement = next.currentMovement.index;
    await expect(page.locator('[data-ring="qi"] .is-current')).toHaveAttribute('data-index', String(qi));
    await expect(page.locator('[data-ring="movement"] .is-current')).toHaveAttribute('data-index', String(movement));
    const changed = [qi !== old.facts.currentStep.index, movement !== old.currentMovement.index];
    expect(changed.some(Boolean)).toBe(true);
    await waitForAnimations(page);
    const samples = await page.evaluate(({ qi, movement }) => window.wheelRefreshes.filter(sample => sample.qi === qi && sample.movement === movement), { qi, movement });
    if (motionMode === 'full') {
      expect(samples.some(sample => sample.animations.map(animation => animation.duration).sort((a, b) => a - b).join(',') === changed.filter(Boolean).flatMap(() => [120, 180]).sort((a, b) => a - b).join(','))).toBe(true);
      expect(samples.some(sample => sample.titles.join(',') === changed.map(String).join(','))).toBe(true);
      expect(samples.flatMap(sample => sample.animations).every(animation => animation.frames.every(frame => !('transform' in frame) && !('strokeDashoffset' in frame)))).toBe(true);
    } else expect(samples.every(sample => sample.animations.length === 0 && sample.titles.every(title => title === 'false'))).toBe(true);
    expect(await page.locator('[aria-live]').count()).toBe(ariaLiveCount);
    await expectMotionDurations(page, testInfo, `M1-d-refresh-${qi}-${movement}`);
    old = next;
  }
  expect(diagnostics.requests.filter(request => request.url.endsWith('/learning/current'))).toHaveLength(3);
  await testInfo.attach('M1-d-wheel-refresh', { body: JSON.stringify(await page.evaluate(() => window.wheelRefreshes)), contentType: 'application/json' });
  expect((await scanAccessibility(page)).violations).toEqual([]);
});
