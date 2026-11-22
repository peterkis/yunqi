import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

// Small pixel deltas include precision and momentum events from touchpads.
// Keep their native one-to-one movement; wheel events do not expose device IDs.
const FINE_DELTA_PX = 32;
const DAMPING = 0.28;
const WHEEL_GAIN = 0.9;
const MAX_LEAD_VIEWPORT = 0.55;

export function attachPanelWheelScroll(main: HTMLElement, { manualStandard = false } = {}): () => void {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (!reduced || typeof requestAnimationFrame !== 'function') return () => {};
  let active: Lenis | undefined;
  let direction = 0;
  let frame: number | undefined;

  function release() {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    active?.destroy();
    active = undefined;
  }

  function advance(time: number) {
    frame = undefined;
    if (!active || !main.contains(active.rootElement)) return release();
    active.raf(time);
    if (active.isScrolling === 'smooth') frame = requestAnimationFrame(advance);
    else release();
  }

  // Capture chooses the owner before Lenis receives this same wheel in bubble.
  // Only one wrapper owns the burst, including on asynchronously mounted readers.
  function wheel(event: WheelEvent) {
    if (!(event.target instanceof Element) || !event.cancelable || event.defaultPrevented
      || (reduced.matches && !manualStandard) || document.hidden || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
      || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)
      || (event.deltaMode === WheelEvent.DOM_DELTA_PIXEL && Math.abs(event.deltaY) < FINE_DELTA_PX)
      || event.target.closest('input, select, textarea, [contenteditable]:not([contenteditable="false"])')) {
      return release();
    }

    const wrapper = event.target.closest<HTMLElement>('[data-panel-scroll]') ?? main;
    const sign = Math.sign(event.deltaY);
    if (active && active.rootElement === wrapper && sign === direction) return;
    release();
    const limit = wrapper.scrollHeight - wrapper.clientHeight;
    if (limit <= 0 || (sign < 0 ? wrapper.scrollTop <= 0 : wrapper.scrollTop >= limit)) return;

    direction = sign;
    const engine: Lenis = new Lenis({
      wrapper, content: wrapper, lerp: DAMPING, wheelMultiplier: WHEEL_GAIN,
      autoRaf: false, syncTouch: false, respectReducedMotion: !manualStandard,
      // Read the current bounds on input, even after opening details. No
      // permanent content wrapper, MutationObserver or ResizeObserver required.
      autoResize: false, naiveDimensions: true,
      virtualScroll(data) {
        if (data.event.type !== 'wheel') return false;
        const pending = engine.targetScroll - engine.animatedScroll;
        const cap = wrapper.clientHeight * MAX_LEAD_VIEWPORT;
        data.deltaY = Math.max(-cap, Math.min(cap, pending + data.deltaY)) - pending;
        return true;
      },
    });
    active = engine;
    frame = requestAnimationFrame(advance);
  }

  const listeners = new AbortController();
  const options = { capture: true, passive: true, signal: listeners.signal };
  // Chromium decides whether a trusted wheel is cancellable before dispatch.
  // This listener must be non-passive so Lenis can intercept the first notch.
  main.addEventListener('wheel', wheel, { ...options, passive: false });
  document.addEventListener('pointerdown', release, options);
  document.addEventListener('keydown', release, options);
  document.addEventListener('focusin', release, options);
  document.addEventListener('visibilitychange', release, options);
  reduced.addEventListener?.('change', release, options);
  return () => { listeners.abort(); release(); };
}
