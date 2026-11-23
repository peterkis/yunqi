import { test, expect, loadCurrent, expectTypeScale, scanAccessibility, waitForAnimations } from './fixtures.mjs';
import { fillBirthDate, expectBirthComparison } from './birth-helpers.mjs';
import { answerConstitution, expectConstitutionResults, constitutionResultValues, confirmConstitutionDestruction } from './constitution-helpers.mjs';
import { expectedMotionLevel, expectMotionCopy, expectMotionDurations, expectImmediateFocusRing, expectIndicatorAligned, observeViewTransitions, observeOffAction } from './motion-helpers.mjs';

test('accessibility animation gate observes completion and times out on paused motion', async ({ page }) => {
  await page.setContent('<p>动画收敛辅助回归</p>');
  expect(await page.evaluate(() => document.body.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 180, fill: 'forwards' }).playState)).toBe('running');
  await waitForAnimations(page);
  expect(await page.evaluate(() => document.getAnimations().map(animation => animation.playState))).toEqual(['finished']);
  await expect(page.locator('body')).toHaveCSS('opacity', '1');

  await page.evaluate(() => document.body.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 180 }).pause());
  await expect(waitForAnimations(page, { timeout: 100 })).rejects.toThrow(/Timeout/);
});

test('focus-ring helper accepts idle defaults and rejects transition outline 120ms', async ({ page }) => {
  await page.setContent('<style>button { outline: 2px solid black; outline-offset: 2px; }</style><button>焦点环回归</button>');
  const target = page.getByRole('button', { name: '焦点环回归', exact: true });
  await expectImmediateFocusRing(page, target);
  await target.evaluate(element => { element.style.transition = 'outline 120ms'; });
  await expect(expectImmediateFocusRing(page, target)).rejects.toThrow(/Focus outline transitions must have zero duration/);
});

// The same oracle runs in all three flow projects and with the real API removed.
// Text, focus and posted/scored data expectations never branch on motion mode.
test('back to top follows the panel and the active classics reader', async ({ page, motionMode }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await loadCurrent(page);
  const main = page.getByRole('main');
  const back = page.getByRole('button', { name: '返回顶部' });
  const offset = node => node.scrollTop;
  await expect(back).toHaveCount(0);
  await main.evaluate(node => { node.scrollTop = 180; });
  await expect(back).toHaveCount(0);
  await main.evaluate(node => { node.scrollTop = 320; });
  await expect(back).toBeInViewport({ ratio: 1 });
  await expect(back).toHaveText('返回顶部');
  await expect(back.locator('svg')).toHaveCount(0);
  await expect(back).toHaveCSS('box-shadow', 'none');
  const copyright = await page.getByText('© 2026-2027', { exact: true }).boundingBox();
  expect(copyright.x + copyright.width).toBeLessThan((await back.boundingBox()).x);
  const mainTrace = await main.evaluateHandle(node => {
    const start = node.scrollTop;
    const sample = { intermediate: false };
    function record() {
      if (node.scrollTop > 0 && node.scrollTop < start) sample.intermediate = true;
      if (node.scrollTop === 0) node.removeEventListener('scroll', record);
    }
    node.addEventListener('scroll', record);
    return sample;
  });
  await back.press('Enter');
  await expect.poll(() => main.evaluate(offset)).toBe(0);
  expect(await mainTrace.evaluate(sample => sample.intermediate)).toBe(motionMode !== 'off');
  await mainTrace.dispose();
  await expect(main).toBeFocused();
  await expect(back).toHaveCount(0);

  await page.getByRole('link', { name: '原文与释义' }).click();
  await page.getByRole('button', { name: '全年', exact: true }).click();
  const reader = page.getByRole('region', { name: '全年原文', exact: true });
  await reader.evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(back).toBeVisible();
  expect(await main.evaluate(offset)).toBe(0);
  const offsets = await back.evaluate(async button => {
    const pane = document.querySelector('[data-panel-scroll]');
    const values = [pane.scrollTop];
    button.click();
    values.push(pane.scrollTop);
    while (pane.scrollTop > 0 && values.length < 90) {
      await new Promise(requestAnimationFrame);
      values.push(pane.scrollTop);
    }
    return values;
  });
  if (motionMode === 'off') expect(offsets[1]).toBe(0);
  else {
    expect(offsets.some(y => y > 0 && y < offsets[0]), 'Return scroll paints intermediate positions').toBe(true);
    expect(offsets).toEqual([...offsets].sort((a, b) => b - a));
  }
  expect(offsets.at(-1)).toBe(0);
  await expect.poll(() => reader.evaluate(offset)).toBe(0);
  await expect(reader).toBeFocused();
  await expect(back).toHaveCount(0);
});

test('motion matrix preserves current, drilldown, birth, scoring, edit, destruction and capsule focus', async ({ page, motionMode, diagnostics }, testInfo) => {
  const current = await loadCurrent(page);
  await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', expectedMotionLevel(motionMode));
  if (motionMode === 'missing-transition') expect(await page.evaluate(() => 'startViewTransition' in document)).toBe(false);
  await expectMotionDurations(page, testInfo, 'current-durations');
  await expectImmediateFocusRing(page, page.getByRole('link', { name: '年度详情', exact: true }));
  await page.locator('.current-overview__quote a').press('Enter');
  await expect(page.locator('.current-classics')).toBeVisible();
  await expect(page.getByRole('main')).toBeFocused();
  await page.getByRole('button', { name: '返回', exact: true }).press('Enter');
  await expect(page.locator('.current-annual-grid')).toContainText(`${current.facts.suiYun.element}运${current.facts.suiYun.state}`);
  await page.getByRole('link', { name: '先天对照', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '年龄', exact: true })).toBeFocused();
  await fillBirthDate(page, '1990-05-12');
  const birthResponse = page.waitForResponse(response => response.url().endsWith('/learning/birth-comparison'));
  await page.getByRole('button', { name: '确认并对照', exact: true }).click();
  const birth = await (await birthResponse).json();
  await expectBirthComparison(page, birth.data);
  await page.getByRole('button', { name: '修改', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '年', exact: true })).toBeFocused();
  await fillBirthDate(page, '1990-05-12');
  await page.getByRole('button', { name: '确认并对照', exact: true }).click();
  const start = page.getByRole('button', { name: '同时测评体质', exact: true });
  await start.click();
  const session = page.getByRole('region', { name: '本次对照体质测评', exact: true });
  await answerConstitution(page, session, { values: constitutionResultValues });
  const actions = page.locator('.panel-shell__actions');
  const scoreResponse = page.waitForResponse(response => response.url().endsWith('/constitution/assess'));
  await actions.getByRole('button', { name: '查看结果', exact: true }).press('Enter');
  const score = await scoreResponse;
  expect(score.status()).toBe(200);
  const { data: assessment } = await score.json();
  await expectConstitutionResults(page, assessment, session);
  await expect(session.locator('.constitution-decision h4')).toBeFocused();
  await expectMotionDurations(page, testInfo, 'result-durations');
  await expectTypeScale(page, testInfo, 'motion-result');
  const scan = await scanAccessibility(page);
  expect(scan.violations).toEqual([]);
  await actions.getByRole('button', { name: '返回修改', exact: true }).press('Enter');
  await expect(session.locator('.constitution-question-title')).toBeFocused();
  await page.keyboard.press(String(constitutionResultValues[25]));
  await expect(actions.getByRole('button', { name: '查看结果', exact: true })).toBeFocused();
  await actions.getByRole('button', { name: '查看结果', exact: true }).press('Enter');
  await expect(session.locator('.constitution-decision h4')).toBeFocused();
  await actions.getByRole('button', { name: '结束并销毁答卷', exact: true }).press('Enter');
  await confirmConstitutionDestruction(page, true);
  await expect(start).toBeFocused();
  await expect(session.getByRole('form')).toHaveCount(0);
  await page.getByRole('button', { name: '收起为胶囊条' }).press('Enter');
  const pill = page.getByRole('button', { name: /^展开运气通/ });
  await expect(pill).toBeFocused();
  await expectMotionDurations(page, testInfo, 'pill-durations');
  await pill.press('Enter');
  await expect(page.getByRole('button', { name: '收起为胶囊条' })).toBeFocused();
  await testInfo.attach('motion-functional-oracle', { body: JSON.stringify({
    mode: motionMode, current: current.facts.input.localTime,
    birth: birth.data, assessment,
    posts: diagnostics.requests.filter(request => request.method === 'POST').map(request => ({ path: new URL(request.url).pathname, body: request.body })),
  }), contentType: 'application/json' });
});

test('motion controls express automatic reset, persist manual choice and apply live system changes', async ({ page, motionMode, browser }, testInfo) => {
  await loadCurrent(page);
  const engine = `Chromium ${browser.version().split('.')[0]}`;
  const automaticReason = { full: 'default', reduced: 'system', off: 'url', 'missing-transition': 'no-view-transition' }[motionMode];
  await expectMotionCopy(page, { level: expectedMotionLevel(motionMode), reason: automaticReason, engine });
  const controls = page.getByRole('radiogroup', { name: '动效', exact: true });
  await expect(controls.getByRole('radio', { name: '自动', exact: true })).toBeChecked();
  for (const [label, level] of [['精简', 'reduced'], ['关闭', 'off'], ['标准', 'full']]) {
    const button = controls.getByRole('radio', { name: label, exact: true });
    await expectImmediateFocusRing(page, button);
    await button.press('Space');
    await expect(button).toBeChecked();
    await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', motionMode === 'off' ? 'off' : level);
    await expectMotionCopy(page, { level: motionMode === 'off' ? 'off' : level, reason: motionMode === 'off' ? 'url' : 'manual', engine });
    await expectMotionDurations(page, testInfo, `manual-${level}`);
    expect(await page.evaluate(() => localStorage.getItem('yunqi-motion'))).toBe(level);
  }
  await page.reload();
  await expect(page.locator('.current-overview')).toBeVisible();
  await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', motionMode === 'off' ? 'off' : 'full');
  await expectMotionCopy(page, { level: motionMode === 'off' ? 'off' : 'full', reason: motionMode === 'off' ? 'url' : 'manual', engine });
  await controls.getByRole('radio', { name: '自动', exact: true }).press('Space');
  expect(await page.evaluate(() => localStorage.getItem('yunqi-motion'))).toBeNull();
  await expectMotionCopy(page, { level: expectedMotionLevel(motionMode), reason: automaticReason, engine });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', motionMode === 'off' ? 'off' : 'reduced');
  await expectMotionCopy(page, { level: motionMode === 'off' ? 'off' : 'reduced', reason: motionMode === 'off' ? 'url' : 'system', engine });
  await expectMotionDurations(page, testInfo, 'system-reduced');
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', 'off');
  await expectMotionCopy(page, { level: 'off', reason: motionMode === 'off' ? 'url' : 'forced-colors', engine });
  await expectMotionDurations(page, testInfo, 'forced-colors-off');
  await controls.getByRole('radio', { name: '标准', exact: true }).press('Space');
  await expectMotionCopy(page, { level: 'off', reason: motionMode === 'off' ? 'url' : 'forced-colors', engine });
  await controls.getByRole('radio', { name: '自动', exact: true }).press('Space');
  await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
  await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', motionMode === 'off' ? 'off' : motionMode === 'missing-transition' ? 'reduced' : 'full');
  await expectMotionCopy(page, { level: motionMode === 'off' ? 'off' : motionMode === 'missing-transition' ? 'reduced' : 'full',
    reason: motionMode === 'off' ? 'url' : motionMode === 'missing-transition' ? 'no-view-transition' : 'default', engine });
});

test.describe('M1-e environment-related CPU sampling', () => {
  test.use({ inFlightProbe: true });
  test('20x CPU tab transitions report the in-flight downgrade (environment-related)', async ({ page, context, motionMode, browser }, testInfo) => {
    test.skip(motionMode !== 'full', 'The CDP observation runs once, in flows-chromium only.');
    test.setTimeout(90_000);
    testInfo.annotations.push({ type: 'environment-related', description: '20x throttling depends on host rendering load; expected downgrade is a soft assertion.' });
    const cdp = await context.newCDPSession(page);
    const observations = [];
    try {
      // Load at normal speed: the card measures the two tab switches, and a
      // throttled initial load can exceed the API wait on a shared CI runner.
      await loadCurrent(page);
      await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', 'full');
      expect(await page.evaluate(() => sessionStorage.getItem('yunqi-motion-frame-in-flight'))).toBeNull();
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 });
      await page.evaluate(() => {
        window.cpuMotionSample = { intervals: [], loaf: [] };
        let previous;
        const sample = timestamp => {
          if (previous !== undefined) window.cpuMotionSample.intervals.push(timestamp - previous);
          previous = timestamp;
          window.cpuMotionFrame = requestAnimationFrame(sample);
        };
        window.cpuMotionFrame = requestAnimationFrame(sample);
        if (PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')) {
          window.cpuMotionObserver = new PerformanceObserver(list => {
            window.cpuMotionSample.loaf.push(...list.getEntries().map(entry => ({ startTime: entry.startTime, duration: entry.duration })));
          });
          window.cpuMotionObserver.observe({ type: 'long-animation-frame', buffered: false });
        }
      });
      for (const label of ['先天对照', '当下运气']) {
        // The SPA commits this transition in a view-transition callback.
        // Await the route and its focus target explicitly after dispatch.
        await page.getByRole('link', { name: label, exact: true }).click({ noWaitAfter: true });
        await expect(page).toHaveURL(label === '先天对照' ? /\/yunqi\/birth(?:\?|$)/ : /\/yunqi\/current(?:\?|$)/);
        if (label === '先天对照') {
          await expect(page.getByRole('textbox', { name: '年龄' })).toBeFocused();
        } else await expect(page.getByRole('main')).toBeFocused();
        await waitForAnimations(page);
        observations.push(await page.evaluate(label => ({ label, level: document.querySelector('.theme-root').dataset.motion,
          stored: sessionStorage.getItem('yunqi-motion-frame-in-flight') }), label));
      }
      await expect.poll(() => page.evaluate(() => sessionStorage.getItem('yunqi-motion-frame-in-flight'))).not.toBeNull();
      const actual = await page.evaluate(() => ({ level: document.querySelector('.theme-root').dataset.motion,
        stored: sessionStorage.getItem('yunqi-motion-frame-in-flight'), sample: window.cpuMotionSample }));
      const reason = actual.stored === 'frame-in-flight' ? 'frame-in-flight' : 'default';
      await expectMotionCopy(page, { level: actual.level, reason, engine: `Chromium ${browser.version().split('.')[0]}` });
      await testInfo.attach('20x-cpu-motion-observation', { body: JSON.stringify({ rate: 20, environmentRelated: true, observations, ...actual }), contentType: 'application/json' });
      expect.soft(actual.level, 'Environment-related: 20x CPU should downgrade after two tab switches').toBe('reduced');
      expect.soft(actual.stored, 'Environment-related: the downgrade should be attributed to in-flight sampling').toBe('frame-in-flight');
    } finally {
      // Restore this owned page even when an assertion fails.
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await page.evaluate(() => { cancelAnimationFrame(window.cpuMotionFrame); window.cpuMotionObserver?.disconnect(); });
      await testInfo.attach('20x-cpu-tab-observations', { body: JSON.stringify(observations), contentType: 'application/json' });
      await cdp.detach();
    }
  });
});

test('segmented indicators align after selection and narrow resize across tabs, reading scopes and sex', async ({ page, motionMode }, testInfo) => {
  async function checkResize(track) {
    await expectIndicatorAligned(page, track);
    await page.setViewportSize({ width: 360, height: 640 });
    await expect(track).toHaveAttribute('data-indicator-animated', 'false');
    await expectIndicatorAligned(page, track);
    await page.setViewportSize({ width: 400, height: 860 });
    await expectIndicatorAligned(page, track);
  }
  await loadCurrent(page);
  await waitForAnimations(page);
  await observeViewTransitions(page);
  const tabs = page.getByRole('navigation', { name: '工作台导航', exact: true });
  await checkResize(tabs);
  for (const label of ['先天对照', '体质量表', '先天对照', '当下运气']) {
    await tabs.getByRole('link', { name: label, exact: true }).click();
    if (label === '先天对照') {
      await expect(page.getByRole('textbox', { name: '年龄' })).toBeFocused();
    } else await expect(page.getByRole('main')).toBeFocused();
    await expect.poll(() => page.getByRole('main').evaluate(element => element.scrollTop)).toBe(0);
    await expect(tabs.locator('.motion-segment-indicator')).toHaveCSS('transition-duration', motionMode === 'full' ? '0.18s, 0.18s' : '0s');
    await checkResize(tabs);
    // Inspect retained-session rectangles after navigation and resize settle.
    await waitForAnimations(page);
    const hiddenSessions = page.locator('.retained-session[hidden]');
    for (const hidden of await hiddenSessions.all()) {
      await expect(hidden).toHaveAttribute('inert', '');
      await expect(hidden).toHaveCSS('display', 'none');
      expect(await hidden.ariaSnapshot()).toBe('');
      expect(await hidden.evaluate(session => [...session.querySelectorAll('*')].every(element => element.getClientRects().length === 0))).toBe(true);
    }
    // Walk real keyboard focus while previously visited sessions stay mounted.
    // Then restore the navigation's main focus without moving its scroll.
    for (let step = 0; step < 8; step += 1) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.retained-session[hidden]')))).toBe(false);
    }
    await page.getByRole('main').focus();
  }
  const transitions = await page.evaluate(() => window.motionTransitions);
  if (motionMode === 'full') {
    expect(transitions.map(sample => sample.direction)).toEqual(['forward', 'forward', 'backward', 'backward']);
    for (const sample of transitions) {
      expect(sample.names).toMatchObject({ root: 'none', main: 'workbench-main', header: 'none', footer: 'none' });
      expect(sample.after).not.toBe(sample.before);
      for (const session of [...sample.beforeSessions, ...sample.afterSessions].filter(session => session.hidden)) {
        expect(session).toMatchObject({ inert: true, namedDescendants: 0 });
      }
    }
  } else expect(transitions).toEqual([]);
  await testInfo.attach('tab-transition-snapshots', { body: JSON.stringify(transitions), contentType: 'application/json' });

  await page.getByRole('link', { name: '原文与释义', exact: true }).click();
  const currentScopes = page.getByRole('group', { name: '原文范围', exact: true });
  await checkResize(currentScopes);
  await currentScopes.getByRole('button', { name: '全年', exact: true }).press('Enter');
  await checkResize(currentScopes);
  await currentScopes.getByRole('button', { name: '当下阶段', exact: true }).click();
  await expectIndicatorAligned(page, currentScopes);
  await expectMotionDurations(page, testInfo, 'reading-indicator-durations');
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await page.getByRole('link', { name: '先天对照', exact: true }).click();
  await fillBirthDate(page, '1990-05-12');
  await page.getByRole('button', { name: '确认并对照', exact: true }).click();
  await page.getByRole('link', { name: '全部原文', exact: true }).click();
  const birthScopes = page.getByRole('navigation', { name: '出生原文范围', exact: true });
  await checkResize(birthScopes);
  await birthScopes.getByRole('button', { name: '全年', exact: true }).click();
  await checkResize(birthScopes);
  await birthScopes.getByRole('button', { name: '出生阶段', exact: true }).press('Enter');
  await expectIndicatorAligned(page, birthScopes);
  const scan = await scanAccessibility(page);
  expect(scan.violations).toEqual([]);

  // The real questionnaire immediately folds its sex selector after choosing.
  // Its shared component fixture keeps the choice mounted for geometry checks.
  await page.goto('/src/test/design-foundations.html');
  const sex = page.getByRole('radiogroup', { name: '量表所用性别', exact: true });
  await sex.getByRole('radio', { name: '男', exact: true }).click();
  await checkResize(sex);
  await sex.getByRole('radio', { name: '男', exact: true }).press('ArrowRight');
  await expect(sex.getByRole('radio', { name: '女', exact: true })).toBeChecked();
  await checkResize(sex);
});

test('drilldown returns restore scroll within 2px and the original entry for mouse and keyboard in every mode', async ({ page, motionMode }, testInfo) => {
  await page.setViewportSize({ width: 400, height: 640 });
  await loadCurrent(page);
  await waitForAnimations(page);
  await observeViewTransitions(page);
  const main = page.getByRole('main');
  const observations = [];
  for (const input of ['mouse', 'keyboard']) {
    for (const [label, content] of [
      ['原文与释义', '.current-classics'], ['年度详情', '.drilldown-annual-summary'], ['指定时点', '.drilldown-time-form'],
    ]) {
      const entry = page.getByRole('link', { name: label, exact: true });
      await entry.scrollIntoViewIfNeeded();
      await entry.focus();
      await waitForAnimations(page);
      const before = await main.evaluate(element => element.scrollTop);
      const entryHref = await entry.getAttribute('href');
      expect(before).toBeGreaterThan(0);
      if (input === 'mouse') await entry.click();
      else await page.keyboard.press('Enter');
      await expect(page).toHaveURL(label === '原文与释义' ? /\/yunqi\/current\/classics(?:\?motion=off)?$/ : label === '年度详情' ? /\/yunqi\/year\/\d{4}(?:\?motion=off)?$/ : /\/yunqi\/calculate(?:\?motion=off)?$/);
      await expect(page.getByRole('region', { name: '页面导航', exact: true }).getByRole('heading', { name: label, exact: true })).toBeVisible();
      await expect(page.locator(content)).toBeVisible();
      await expect(main).toBeFocused();
      await expectMotionDurations(page, testInfo, `${input}-${label}-durations`);
      const back = page.getByRole('button', { name: '返回', exact: true });
      const entrySelector = label === '原文与释义' ? '.current-overview__quote a' : `.current-more a[href="${entryHref}"]`;
      if (motionMode === 'off') await observeOffAction(page, '.panel-shell__drilldown button', entrySelector);
      if (input === 'mouse') await back.click();
      else { await back.focus(); await page.keyboard.press('Enter'); }
      if (motionMode === 'off') expect(await page.evaluate(() => window.motionActionTime)).toBeLessThanOrEqual(290);
      await expect(page).toHaveURL(/\/yunqi\/current(?:\?motion=off)?$/);
      await expect(entry).toBeFocused();
      await waitForAnimations(page);
      await expect.poll(async () => Math.abs(await main.evaluate(element => element.scrollTop) - before)).toBeLessThanOrEqual(2);
      observations.push({ input, label, before, after: await main.evaluate(element => element.scrollTop) });
    }
  }
  const transitions = await page.evaluate(() => window.motionTransitions);
  if (motionMode === 'full') {
    expect(transitions.map(sample => sample.direction)).toEqual(Array.from({ length: 6 }, () => ['forward', 'backward']).flat());
    for (const sample of transitions.filter(sample => sample.direction === 'forward')) {
      expect(sample.names).toEqual({ root: 'none', main: 'workbench-main', title: 'panel-title', header: 'none', footer: 'none' });
    }
  } else expect(transitions).toEqual([]);
  await testInfo.attach('drilldown-restoration', { body: JSON.stringify({ mode: motionMode, observations, transitions }), contentType: 'application/json' });
  const scan = await scanAccessibility(page);
  expect(scan.violations).toEqual([]);
});

test('theme colors commit together, suppress element transitions and use only the full root crossfade', async ({ page, motionMode }, testInfo) => {
  await loadCurrent(page);
  await waitForAnimations(page);
  await observeViewTransitions(page);
  const direct = [];
  for (const theme of ['dark', 'light']) {
    // Read the direct fallback in the click's own task, before its two-frame
    // marker cleanup. Full mode records the same facts in the real callback.
    direct.push(await page.evaluate(() => {
      document.querySelector('.panel-shell > .ds-panel-header button').click();
      const root = document.querySelector('.theme-root');
      return { theme: root.dataset.theme, switching: root.hasAttribute('data-theme-switching'),
        suppressed: [...root.querySelectorAll('*')].every(element => getComputedStyle(element).transitionDuration.split(',').every(duration => Number.parseFloat(duration) === 0)) };
    }));
    await expect(page.locator('.theme-root')).toHaveAttribute('data-theme', theme);
    await expectMotionDurations(page, testInfo, `theme-${theme}`);
    await waitForAnimations(page);
    await expect(page.locator('.theme-root')).not.toHaveAttribute('data-theme-switching');
  }
  const transitions = await page.evaluate(() => window.motionTransitions);
  if (motionMode === 'full') {
    expect(transitions.map(sample => sample.theme)).toEqual(['dark', 'light']);
    for (const sample of transitions) {
      expect(sample.scope).toBe('theme');
      expect(sample.names).toMatchObject({ root: 'root', main: 'none', header: 'none', footer: 'none' });
      expect(sample.switching).toBe(true);
      expect(sample.transitionsSuppressed).toBe(true);
    }
  } else {
    expect(transitions).toEqual([]);
    expect(direct).toEqual(['dark', 'light'].map(theme => ({ theme, switching: true, suppressed: true })));
  }
  await testInfo.attach('theme-transition-snapshots', { body: JSON.stringify({ direct, transitions }), contentType: 'application/json' });
  const scan = await scanAccessibility(page);
  expect(scan.violations).toEqual([]);
});

test('workbench segments keep their surface while pressed', async ({ page }) => {
  await page.goto('/yunqi/birth');
  const navigation = page.getByRole('navigation', { name: '工作台导航' });
  const precision = page.getByRole('radiogroup', { name: '出生年份录入方式' });
  async function checkPress(target) {
    await target.hover();
    await waitForAnimations(page);
    const resting = await target.evaluate(node => getComputedStyle(node).backgroundColor);
    if (!await target.evaluate(node => node.matches('[aria-current="page"], [aria-checked="true"], [aria-pressed="true"]'))) {
      expect(resting).toBe('rgba(0, 0, 0, 0)');
    }
    await page.mouse.down();
    try {
      await waitForAnimations(page);
      await expect(target).toHaveCSS('background-color', resting);
    } finally {
      await page.mouse.move(1, 1);
      await page.mouse.up();
    }
  }
  await expect(page.locator('.panel-shell > header')).toHaveCSS('border-bottom-width', '0px');
  await checkPress(navigation.getByRole('link', { name: '先天对照' }));
  await checkPress(navigation.getByRole('link', { name: '当下运气' }));
  await checkPress(precision.getByRole('radio', { name: '按年龄推算' }));
  await checkPress(precision.getByRole('radio', { name: '按出生年份' }));
  await fillBirthDate(page, '1990-03-21');
  await page.getByRole('button', { name: /补录时刻/ }).click();
  await expect(page.getByLabel('出生时刻', { exact: true })).toBeVisible();
  await expect(page.getByText('保留当天所有可能归属', { exact: true })).toHaveCount(0);
  await expect(precision).not.toHaveAttribute('aria-describedby');
  await navigation.getByRole('link', { name: '体质量表' }).click();
  const sex = page.getByRole('radiogroup', { name: '量表所用性别' });
  for (const name of ['男', '女']) await checkPress(sex.getByRole('radio', { name, exact: true }));
  await navigation.getByRole('link', { name: '当下运气' }).click();
  await page.getByRole('link', { name: '原文与释义', exact: true }).click();
  await checkPress(page.getByRole('button', { name: '全年', exact: true }));
});

test('press feedback scales full controls only and leaves text buttons and focus rings unscaled', async ({ page, motionMode }, testInfo) => {
  await page.goto('/src/test/design-foundations.html');
  const primary = page.getByRole('button', { name: '查看原文', exact: true });
  const text = page.getByRole('button', { name: '返回修改', exact: true });
  const segment = page.getByRole('navigation', { name: '视图', exact: true }).getByRole('link', { name: '当下运气', exact: true });
  for (const [target, isText] of [[primary, false], [segment, false], [text, true]]) {
    await target.hover();
    await waitForAnimations(page);
    await expect.poll(() => target.evaluate(element => getComputedStyle(element).transitionProperty.split(',').map(value => value.trim()).includes('transform')))
      .toBe(motionMode === 'full' && !isText);
    const before = await target.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color }));
    await page.mouse.down();
    try {
      await expect.poll(() => target.evaluate(element => {
        const transform = getComputedStyle(element).transform;
        return transform === 'none' ? 1 : Number(transform.match(/matrix\(([^,]+)/)[1]);
      })).toBe(motionMode === 'full' && !isText ? 0.98 : 1);
      if (isText) {
        await expect(target).toHaveCSS('background-color', before.background);
        await expect.poll(() => target.evaluate(element => getComputedStyle(element).color)).not.toBe(before.color);
      } else if (target === segment) {
        await expect(target).toHaveCSS('background-color', before.background);
      } else await expect.poll(() => target.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(before.background);
      await expectMotionDurations(page, testInfo, `press-${isText ? 'text' : 'control'}`);
    } finally { await page.mouse.up(); }
    await expectImmediateFocusRing(page, target);
  }
});
