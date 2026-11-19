import { useLayoutEffect, useRef } from 'react';
import type { InFlightProbeHandle } from '../../lib/in-flight-motion-probe';
import { motionMilliseconds } from '../../lib/motion';
import { useMotionInFlightObserver, useMotionLevel } from '../../providers/MotionProvider';

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
  const activeProbe = useRef<InFlightProbeHandle | undefined>(undefined);
  const level = useMotionLevel();
  const observeInFlight = useMotionInFlightObserver();

  useLayoutEffect(() => {
    const track = trackRef.current!;
    let animated = false;
    const selected = measure(track, next => {
      animated = level === 'full' && next !== null && previous.current !== null && previous.current !== next;
      return animated;
    });
    previous.current = selected;
    if (!animated || !observeInFlight) return;
    const probe = observeInFlight(motionMilliseconds(track, '--motion-base') || 180);
    activeProbe.current = probe;
    return () => {
      probe?.cancel();
      if (activeProbe.current === probe) activeProbe.current = undefined;
    };
  }, [selection, level, observeInFlight]);

  useLayoutEffect(() => {
    const track = trackRef.current!;
    function resize() {
      // A resize also cancels an in-flight slide: the next paint is aligned.
      activeProbe.current?.cancel();
      activeProbe.current = undefined;
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
