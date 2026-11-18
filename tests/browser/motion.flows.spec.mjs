import { test, expect, loadCurrent, expectTypeScale, scanAccessibility, waitForAnimations } from './fixtures.mjs';
import { fillBirthDate, expectBirthComparison } from './birth-helpers.mjs';
import { answerConstitution, expectConstitutionResults, constitutionResultValues } from './constitution-helpers.mjs';
import { expectedMotionLevel, expectMotionDurations, expectImmediateFocusRing } from './motion-helpers.mjs';

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
  await expect(page.getByRole('main')).toBeFocused();
  await fillBirthDate(page, '1990-05-12');
  const birthResponse = page.waitForResponse(response => response.url().endsWith('/learning/birth-comparison'));
  await page.getByRole('button', { name: '查看对照', exact: true }).click();
  const birth = await (await birthResponse).json();
  await expectBirthComparison(page, birth.data);
  await page.getByRole('button', { name: '修改', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '年', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '查看对照', exact: true }).click();
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
  await expect(session.getByRole('heading', { name: '26 题已全部作答', exact: true })).toBeFocused();
  await actions.getByRole('button', { name: '查看结果', exact: true }).press('Enter');
  await expect(session.locator('.constitution-decision h4')).toBeFocused();
  await actions.getByRole('button', { name: '结束并销毁答卷', exact: true }).press('Enter');
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

test('motion controls express automatic reset, persist manual choice and apply live system changes', async ({ page, motionMode }, testInfo) => {
  await loadCurrent(page);
  await page.getByText('动效设置', { exact: true }).click();
  const controls = page.getByRole('radiogroup', { name: '动效', exact: true });
  await expect(controls.getByRole('radio', { name: '自动', exact: true })).toBeChecked();
  for (const [label, level] of [['精简', 'reduced'], ['关闭', 'off'], ['标准', 'full']]) {
    const button = controls.getByRole('radio', { name: label, exact: true });
    await expectImmediateFocusRing(page, button);
    await button.press('Space');
    await expect(button).toBeChecked();
    await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', motionMode === 'off' ? 'off' : level);
    await expectMotionDurations(page, testInfo, `manual-${level}`);
    expect(await page.evaluate(() => localStorage.getItem('yunqi-motion'))).toBe(level);
  }
  await page.reload();
  await expect(page.locator('.current-overview')).toBeVisible();
  await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', motionMode === 'off' ? 'off' : 'full');
  await page.getByText('动效设置', { exact: true }).click();
  await controls.getByRole('radio', { name: '自动', exact: true }).press('Space');
  expect(await page.evaluate(() => localStorage.getItem('yunqi-motion'))).toBeNull();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', motionMode === 'off' ? 'off' : 'reduced');
  await expectMotionDurations(page, testInfo, 'system-reduced');
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', 'off');
  await expectMotionDurations(page, testInfo, 'forced-colors-off');
  await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
  await expect(page.locator('.theme-root')).toHaveAttribute('data-motion', motionMode === 'off' ? 'off' : motionMode === 'missing-transition' ? 'reduced' : 'full');
});
