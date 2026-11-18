import type { MotionLevel } from '../providers/MotionProvider';

/** Read rendering tokens only. No clock or business-time calculation. */
export function motionMilliseconds(element: Element, token: string): number {
  const value = getComputedStyle(element).getPropertyValue(token).trim();
  return Math.max(0, Number.parseFloat(value) || 0) * (value.endsWith('ms') ? 1 : 1000);
}

/** The DOM always has its visible final style before this optional effect. */
export function animateMotion(element: Element | null, level: MotionLevel, frames: Keyframe[], token: string, easing = '--ease-linear', fill: FillMode = 'backwards') {
  if (!element || level === 'off' || typeof element.animate !== 'function') return;
  try {
    return element.animate(frames, {
      duration: motionMilliseconds(element, token),
      easing: getComputedStyle(element).getPropertyValue(easing).trim(),
      fill,
    });
  } catch { /* Older WebViews may expose WAAPI but reject an effect. */ }
}
