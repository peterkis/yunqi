import { test, expect, loadCurrent, settle } from './fixtures.mjs';
import { fillBirthDate } from './birth-helpers.mjs';

test('panel wheel: a user can opt into standard scrolling with system reduced motion', async ({ page, motionMode }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loadCurrent(page);
  const main = page.getByRole('main');
  const settings = page.locator('.motion-settings');
  const root = page.locator('.theme-root');
  const urlOff = motionMode === 'off';

  async function checkWheel(smooth) {
    await settle(page);
    await main.evaluate(node => {
      node.scrollTop = 0;
      window.nextPanelWheel = new Promise(resolve => document.addEventListener('wheel', event => {
        resolve({ intercepted: event.defaultPrevented, smooth: node.classList.contains('lenis-smooth') });
      }, { once: true, passive: true }));
    });
    await main.hover();
    await page.mouse.wheel(0, 120);
    expect(await page.evaluate(() => window.nextPanelWheel)).toEqual({ intercepted: smooth, smooth });
    await expect.poll(() => main.evaluate(node => node.scrollTop)).toBe(smooth ? 108 : 120);
  }

  await settings.locator('summary').click();
  await expect(root).toHaveAttribute('data-motion', urlOff ? 'off' : 'reduced');
  await checkWheel(false);
  await settings.getByRole('radio', { name: '标准', exact: true }).click();
  await expect(root).toHaveAttribute('data-motion', urlOff ? 'off' : 'full');
  await checkWheel(!urlOff);
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(root).toHaveAttribute('data-motion', 'off');
  await checkWheel(false);
  await page.emulateMedia({ forcedColors: 'none' });
  await settings.getByRole('radio', { name: '自动', exact: true }).click();
  await expect(root).toHaveAttribute('data-motion', urlOff ? 'off' : 'reduced');
  await checkWheel(false);
});

test('panel wheel: damped travel, settlement and native motion preferences', async ({ page, motionMode }, testInfo) => {
  await loadCurrent(page);
  await settle(page);
  const main = page.getByRole('main');
  await main.hover();
  await main.evaluate(node => {
    node.scrollTop = 0;
    window.wheelSample = new Promise(resolve => {
      document.addEventListener('wheel', event => {
        const start = performance.now();
        const frames = [];
        function sample() {
          frames.push({ ms: performance.now() - start, y: node.scrollTop });
          if (frames.at(-1).ms > 1500 || (frames.length > 1 && !node.classList.contains('lenis'))) {
            resolve({ intercepted: event.defaultPrevented, frames });
          } else requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }, { once: true });
    });
  });
  await page.mouse.wheel(0, 120);
  const result = await page.evaluate(() => window.wheelSample);
  await testInfo.attach('wheel-sample', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.intercepted).toBe(motionMode === 'full');
  if (motionMode === 'full') {
    const positions = result.frames.map(frame => frame.y);
    expect(positions.at(-1)).toBeCloseTo(108, 0);
    expect(positions.some(y => y > 0 && y < 108)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    await expect(main).not.toHaveClass(/\blenis\b/);
    // Count actual frame requests in an idle interval without a polling rAF.
    const idleFrames = await page.evaluate(async () => {
      await new Promise(resolve => setTimeout(resolve, 70)); // allow the final native scrollend
      const original = window.requestAnimationFrame;
      let requests = 0;
      window.requestAnimationFrame = callback => { requests++; return original.call(window, callback); };
      try { await new Promise(resolve => setTimeout(resolve, 180)); }
      finally { window.requestAnimationFrame = original; }
      return requests;
    });
    expect(idleFrames).toBe(0);
  } else {
    await expect.poll(() => main.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  }
});

test('panel wheel: bounded bursts, reversal, precise inputs and interruptions', async ({ page, motionMode }) => {
  test.skip(motionMode !== 'full', 'Tests the optional full-motion driver');
  await loadCurrent(page);
  await settle(page);
  const main = page.getByRole('main');
  const cap = await main.evaluate(node => {
    node.scrollTop = 0;
    for (let i = 0; i < 12; i++) node.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
    return Math.min(node.clientHeight * 0.55, node.scrollHeight - node.clientHeight);
  });
  await expect.poll(() => main.evaluate(node => node.classList.contains('lenis'))).toBe(false);
  expect(Math.abs(await main.evaluate(node => node.scrollTop) - cap)).toBeLessThanOrEqual(1);
  const origin = await main.evaluate(node => {
    const origin = node.scrollTop;
    for (const deltaY of [240, -120]) node.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }));
    return origin;
  });
  await expect.poll(() => main.evaluate(node => node.scrollTop)).toBe(origin - 108);
  const states = await main.evaluate(node => {
    const wheel = init => node.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true, ...init }));
    const bypassed = [wheel({ deltaY: 6 }), wheel({ ctrlKey: true }), wheel({ shiftKey: true }), wheel({ deltaX: 240 })];
    const before = node.scrollTop;
    wheel({});
    node.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    return { bypassed, stopped: !node.classList.contains('lenis'), before };
  });
  expect(states.bypassed).toEqual([true, true, true, true]);
  expect(states.stopped).toBe(true);
  expect(await main.evaluate(node => node.scrollTop)).toBe(states.before);
});

test('panel wheel: both reading panes own their wheel without scrolling the outer panel', async ({ page, motionMode }) => {
  test.skip(motionMode !== 'full', 'Checks nested Lenis ownership');
  await page.setViewportSize({ width: 400, height: 640 });
  await loadCurrent(page);
  for (const birth of [false, true]) {
    if (birth) {
      await page.getByRole('link', { name: '先天对照', exact: true }).click();
      await fillBirthDate(page, '1990-05-12');
      await page.getByRole('button', { name: '查看对照', exact: true }).click();
    }
    await page.getByRole('link', { name: birth ? '全部原文' : '原文与释义', exact: true }).click();
    await page.getByRole('button', { name: '全年', exact: true }).click();
    const reader = page.locator('[data-panel-scroll]:visible');
    await settle(page);
    const state = await reader.evaluate(node => {
      const main = node.closest('main');
      const parent = main.scrollTop;
      const limit = node.scrollHeight - node.clientHeight;
      const intercepted = !node.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
      return { parent, limit, intercepted, inner: node.classList.contains('lenis-smooth'), outer: main.classList.contains('lenis') };
    });
    expect(state.limit).toBeGreaterThan(0);
    expect(state).toMatchObject({ intercepted: true, inner: true, outer: false });
    await expect.poll(() => reader.evaluate(node => node.scrollTop)).toBe(Math.min(108, state.limit));
    expect(await page.getByRole('main').evaluate(node => node.scrollTop)).toBe(state.parent);
    await page.getByRole('button', { name: '返回', exact: true }).click();
    await expect(page.locator('.lenis')).toHaveCount(0);
  }
});
