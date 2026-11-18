import { expect, waitForAnimations } from './fixtures.mjs';

export const expectedMotionLevel = mode => mode === 'missing-transition' ? 'reduced' : mode;

export async function expectTransitionDuration(page, target, token = 'base', pressFeedback = false) {
  const level = await page.locator('.theme-root').getAttribute('data-motion');
  const milliseconds = level === 'off' ? 0 : level === 'reduced' || token === 'fast' ? 120 : 180;
  if (pressFeedback && level !== 'off') {
    const properties = ['opacity', 'color', 'background-color', 'border-color', ...(level === 'full' ? ['transform'] : [])];
    await expect.poll(() => target.evaluate(element => {
      const style = getComputedStyle(element);
      return { properties: style.transitionProperty.split(',').map(value => value.trim()),
        durations: style.transitionDuration.split(',').map(value => Number.parseFloat(value) * 1000) };
    })).toEqual({ properties, durations: [milliseconds, ...properties.slice(1).map(() => 120)] });
  } else {
    await expect.poll(() => target.evaluate(element => getComputedStyle(element).transitionDuration.split(',').map(value => Number.parseFloat(value) * 1000)))
      .toEqual(Array(level === 'off' ? 1 : token === 'fast' ? level === 'full' ? 4 : 3 : 1).fill(milliseconds));
  }
}

export async function expectMotionDurations(page, testInfo, name = 'motion-durations') {
  const snapshot = await page.evaluate(() => {
    const level = document.querySelector('.theme-root').dataset.motion;
    const allowed = ['opacity', 'color', 'background-color', 'border-color'];
    const samples = [];
    const illegalReduced = [];
    // Include live browser-generated snapshot groups, not just DOM elements.
    const viewTransitions = document.getAnimations().filter(animation => animation.effect?.pseudoElement?.startsWith('::view-transition'))
      .map(animation => ({ pseudo: animation.effect.pseudoElement, duration: animation.effect.getTiming().duration }));
    samples.push(...viewTransitions.map(sample => Number(sample.duration)));
    for (const element of document.querySelectorAll('*')) {
      for (const pseudo of [null, '::before', '::after', ...(element.tagName === 'DETAILS' ? ['::details-content'] : [])]) {
        const style = getComputedStyle(element, pseudo);
        const durations = [style.transitionDuration, style.animationDuration].flatMap(value => value.split(',').map(part => Number.parseFloat(part) * (part.trim().endsWith('ms') ? 1 : 1000)));
        samples.push(...durations);
        if (level === 'reduced' && durations.some(value => value > 0)) {
          const properties = style.transitionProperty.split(',').map(value => value.trim());
          if (properties.some(property => !allowed.includes(property))) illegalReduced.push({ element: element.className, pseudo, properties });
          if (style.animationName !== 'none') illegalReduced.push({ element: element.className, pseudo, animation: style.animationName });
        }
      }
    }
    return { level, count: samples.length, maximum: Math.max(...samples), illegalReduced, viewTransitions };
  });
  if (testInfo) await testInfo.attach(name, { body: JSON.stringify(snapshot), contentType: 'application/json' });
  expect(snapshot.count).toBeGreaterThan(0);
  expect(snapshot.maximum).toBeLessThanOrEqual({ full: 320, reduced: 120, off: 0 }[snapshot.level]);
  expect(snapshot.illegalReduced).toEqual([]);
  return snapshot;
}

export async function expectIndicatorAligned(page, track) {
  await expect(track).toHaveAttribute('data-indicator-ready', 'true');
  await waitForAnimations(page);
  const indicator = track.locator(':scope > .motion-segment-indicator');
  const selected = track.locator(':scope > :is([aria-current="page"], [aria-checked="true"], [aria-pressed="true"])');
  await expect(indicator).toBeVisible();
  await expect.poll(async () => {
    const [block, button] = await Promise.all([indicator.boundingBox(), selected.boundingBox()]);
    if (!block || !button) return Number.POSITIVE_INFINITY;
    return Math.max(...['x', 'y', 'width', 'height'].map(axis => Math.abs(block[axis] - button[axis])));
  }, { message: 'The settled indicator and selected button must align within 1px' }).toBeLessThanOrEqual(1);
}

/** Observe the real API without replacing its animation or waiting for it. */
export async function observeViewTransitions(page) {
  await page.evaluate(() => {
    window.motionTransitions = [];
    const start = document.startViewTransition;
    if (typeof start !== 'function') return;
    document.startViewTransition = function (update) {
      const sample = { scope: document.documentElement.dataset.viewTransition,
        direction: document.documentElement.dataset.navigationDirection };
      const main = document.querySelector('main');
      sample.before = main?.textContent;
      window.motionTransitions.push(sample);
      return start.call(document, () => {
        update();
        const root = document.querySelector('.theme-root');
        sample.after = document.querySelector('main')?.textContent;
        sample.names = {
          root: getComputedStyle(document.documentElement).viewTransitionName,
          main: getComputedStyle(document.querySelector('main')).viewTransitionName,
          title: document.querySelector('.panel-shell__drilldown .ds-panel-header__text')
            ? getComputedStyle(document.querySelector('.panel-shell__drilldown .ds-panel-header__text')).viewTransitionName : undefined,
          header: getComputedStyle(document.querySelector('.panel-shell > .ds-panel-header')).viewTransitionName,
          footer: getComputedStyle(document.querySelector('.panel-shell__footer')).viewTransitionName,
        };
        sample.theme = root.dataset.theme;
        sample.switching = root.hasAttribute('data-theme-switching');
        sample.transitionsSuppressed = [...root.querySelectorAll('*')].every(element =>
          getComputedStyle(element).transitionDuration.split(',').every(duration => Number.parseFloat(duration) === 0));
      });
    };
  });
}

export function expectNoOutlineTransition(transitionProperty, transitionDuration) {
  const properties = transitionProperty.split(',').map(value => value.trim());
  const durations = transitionDuration.split(',').map(value => value.trim());
  // CSS repeats shorter duration lists to match transition-property; any extra
  // durations are ignored. The default all / 0s does not animate the outline.
  for (const [index, property] of properties.entries()) {
    if (property === 'all' || property.startsWith('outline')) {
      const duration = durations[index % durations.length];
      expect(Number.parseFloat(duration), `Focus outline transitions must have zero duration (${property}: ${duration})`).toBe(0);
    }
  }
}

export async function expectImmediateFocusRing(page, target) {
  await page.keyboard.press('Tab');
  // Inspect in the same task that moves keyboard focus, before another frame.
  const ring = await target.evaluate(element => {
    element.focus();
    const style = getComputedStyle(element);
    return { outline: style.outlineStyle, width: style.outlineWidth, offset: style.outlineOffset, transition: style.transitionProperty, duration: style.transitionDuration };
  });
  expect(ring.outline).toBe('solid');
  expect(ring.width).toBe('2px');
  expect(ring.offset).toBe('2px');
  expectNoOutlineTransition(ring.transition, ring.duration);
  await expect(target).toBeFocused();
}
