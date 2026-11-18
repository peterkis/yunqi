import { expect } from './fixtures.mjs';

export const expectedMotionLevel = mode => mode === 'missing-transition' ? 'reduced' : mode;

export async function expectTransitionDuration(page, target, token = 'base') {
  const level = await page.locator('.theme-root').getAttribute('data-motion');
  const milliseconds = level === 'off' ? 0 : level === 'reduced' || token === 'fast' ? 120 : 180;
  await expect.poll(() => target.evaluate(element => getComputedStyle(element).transitionDuration.split(',').map(value => Number.parseFloat(value) * 1000)))
    .toEqual(Array(level === 'off' ? 1 : token === 'fast' ? level === 'full' ? 4 : 3 : 1).fill(milliseconds));
}

export async function expectMotionDurations(page, testInfo, name = 'motion-durations') {
  const snapshot = await page.evaluate(() => {
    const level = document.querySelector('.theme-root').dataset.motion;
    const allowed = ['opacity', 'color', 'background-color', 'border-color'];
    const samples = [];
    const illegalReduced = [];
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
    return { level, count: samples.length, maximum: Math.max(...samples), illegalReduced };
  });
  if (testInfo) await testInfo.attach(name, { body: JSON.stringify(snapshot), contentType: 'application/json' });
  expect(snapshot.count).toBeGreaterThan(0);
  expect(snapshot.maximum).toBeLessThanOrEqual({ full: 320, reduced: 120, off: 0 }[snapshot.level]);
  expect(snapshot.illegalReduced).toEqual([]);
  return snapshot;
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
