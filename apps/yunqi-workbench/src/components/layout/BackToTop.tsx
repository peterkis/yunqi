import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { motionMilliseconds } from '../../lib/motion';
import { useMotionLevel, useMotionPreference } from '../../providers/MotionProvider';
import { Button } from '../design/Button';

const REVEAL_SCROLL_PX = 240;

function scrollToTop(scroller: HTMLElement, duration: number) {
  if (!duration) {
    scroller.scrollTop = 0;
    return;
  }
  if (typeof requestAnimationFrame !== 'function' || typeof cancelAnimationFrame !== 'function') {
    scroller.setAttribute('data-native-back-to-top', '');
    scroller.scrollTop = 0;
    scroller.removeAttribute('data-native-back-to-top');
    return;
  }
  const from = scroller.scrollTop;
  const listeners = new AbortController();
  let started: number | undefined;
  let frame = requestAnimationFrame(advance);

  function cancel() {
    cancelAnimationFrame(frame);
    listeners.abort();
  }
  function advance(now: number) {
    started ??= now;
    const t = Math.min(1, (now - started) / duration);
    // Ease in and out without handing the movement to the browser's optional
    // native smooth-scroll animation.
    scroller.scrollTop = from * (1 - t * t * (3 - 2 * t));
    if (t < 1) frame = requestAnimationFrame(advance);
    else listeners.abort();
  }
  for (const event of ['wheel', 'pointerdown', 'touchstart', 'keydown', 'focusin', 'visibilitychange']) {
    document.addEventListener(event, cancel, { capture: true, passive: true, signal: listeners.signal });
  }
  return cancel;
}

export function BackToTop({ contentRef }: { readonly contentRef: RefObject<HTMLElement | null> }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const level = useMotionLevel();
  const preference = useMotionPreference();
  const cancel = useRef<(() => void) | undefined>(undefined);
  const animate = level !== 'off' && preference !== 'reduced';
  useLayoutEffect(() => () => cancel.current?.(), [animate]);

  useLayoutEffect(() => {
    const main = contentRef.current;
    if (!main) return;

    function update(scroller: HTMLElement) {
      setTarget(scroller.scrollTop >= REVEAL_SCROLL_PX ? scroller : null);
    }
    function onScroll(event: Event) {
      const scroller = event.target;
      if (scroller instanceof HTMLElement && (scroller === main || scroller.hasAttribute('data-panel-scroll'))) {
        update(scroller);
      }
    }
    // Readers can retain their position across panel collapse and route restoration.
    const reader = [...main.querySelectorAll<HTMLElement>('[data-panel-scroll]')]
      .find(node => node.clientHeight > 0 && node.scrollTop >= REVEAL_SCROLL_PX);
    update(reader ?? main);
    main.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => main.removeEventListener('scroll', onScroll, true);
  }, [contentRef]);

  if (!target) return null;
  function returnToTop() {
    if (!target || !contentRef.current?.contains(target)) return;
    cancel.current?.();
    target.focus({ preventScroll: true });
    // A user-requested return may use the shorter animation when Windows
    // reduces motion. The app's explicit reduced/off settings still win.
    const duration = level === 'full' ? motionMilliseconds(target, '--motion-emphasis') : 2 * motionMilliseconds(target, '--motion-fast');
    cancel.current = scrollToTop(target, animate ? duration : 0);
  }
  return <Button variant="text" data-back-to-top="" onClick={returnToTop}>返回顶部</Button>;
}
