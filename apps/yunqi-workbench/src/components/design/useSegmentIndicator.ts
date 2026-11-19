import { useLayoutEffect, useRef } from 'react';
import { useMotionLevel } from '../../providers/MotionProvider';

function measure(track: HTMLElement, animate?: (selected: HTMLElement | null) => boolean) {
  const selected = track.querySelector<HTMLElement>(
    ':scope > [aria-current="page"], :scope > [aria-checked="true"], :scope > [aria-pressed="true"]',
  );
  // Read every layout coordinate before any style write, so the browser does
  // not apply the new transform while transitions are still suppressed.
  const geometry = selected && { left: selected.offsetLeft, width: selected.offsetWidth,
    top: selected.offsetTop, height: selected.offsetHeight };
  track.dataset.indicatorAnimated = String(animate?.(selected) ?? false);
  track.dataset.indicatorReady = String(geometry !== null && geometry.width > 0);
  if (geometry) {
    track.style.setProperty('--segment-left', `${geometry.left}px`);
    track.style.setProperty('--segment-width', `${geometry.width}px`);
    track.style.setProperty('--segment-top', `${geometry.top}px`);
    track.style.setProperty('--segment-indicator-height', `${geometry.height}px`);
  }
  return selected;
}

/** One geometry owner for route tabs, local choices and reading scopes.
 * Measurements are layout coordinates, independent of the press transform. */
export function useSegmentIndicator<Element extends HTMLElement = HTMLDivElement>(selection: string) {
  const trackRef = useRef<Element>(null);
  const previous = useRef<HTMLElement | null>(null);
  const level = useMotionLevel();

  useLayoutEffect(() => {
    const track = trackRef.current!;
    const selected = measure(track, next => level === 'full' && next !== null && previous.current !== null && previous.current !== next);
    previous.current = selected;
  }, [selection, level]);

  useLayoutEffect(() => {
    const track = trackRef.current!;
    function resize() {
      // A resize also cancels an in-flight slide: the next paint is aligned.
      measure(track);
    }
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(resize);
      observer.observe(track);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return trackRef;
}
