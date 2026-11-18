import type { MotionLevel } from '../../../providers/MotionProvider';

/** An inert, short-lived visual copy can fade after the live answer state has
 * already been destroyed, including when the embedded form unmounts. No
 * application logic or focus waits for this optional animation. */
export function fadeDestroyedAnswer(form: HTMLFormElement | null, level: MotionLevel) {
  if (!form || level === 'off') return;
  const root = form.closest('.theme-root');
  if (!root) return;
  const ghost = document.createElement('div');
  if (typeof ghost.animate !== 'function') return;
  const main = form.closest('main');
  const surface = form.closest('.panel-shell') ?? main ?? root;
  const origin = surface.getBoundingClientRect();
  const bounds = form.getBoundingClientRect();
  const viewport = main?.getBoundingClientRect();
  const bottom = viewport?.bottom ?? bounds.bottom;
  ghost.className = 'constitution-answer-form constitution-destroy-ghost';
  ghost.inert = true;
  ghost.setAttribute('inert', '');
  ghost.setAttribute('aria-hidden', 'true');
  const copy = form.cloneNode(true);
  ghost.append(...copy.childNodes);
  for (const element of ghost.querySelectorAll('*')) {
    // This is a visual snapshot, including when a new live form is opened in
    // the same task. Do not duplicate live regions, IDs or focus attributes.
    for (const { name } of [...element.attributes]) {
      if (name.startsWith('aria-') || ['id', 'name', 'form', 'for', 'headers', 'role', 'tabindex', 'autofocus', 'contenteditable'].includes(name)) element.removeAttribute(name);
    }
  }
  const sourceStyle = getComputedStyle(form);
  for (const name of ['--constitution-hairline', '--constitution-tick-thirty', '--constitution-tick-forty']) {
    ghost.style.setProperty(name, sourceStyle.getPropertyValue(name));
  }
  for (const [name, value] of Object.entries({ left: bounds.left - origin.left + surface.scrollLeft, top: bounds.top - origin.top + surface.scrollTop, width: bounds.width, height: Math.max(0, Math.min(bounds.bottom, bottom) - bounds.top), 'clip-top': Math.max(0, (viewport?.top ?? bounds.top) - bounds.top) })) {
    ghost.style.setProperty(`--destroy-${name}`, `${value}px`);
  }
  surface.append(ghost);
  const style = getComputedStyle(ghost);
  const duration = Number.parseFloat(style.getPropertyValue('--motion-fast'));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const session = form.closest<HTMLElement>('.retained-session');
  const observer = new MutationObserver(() => {
    if (root.getAttribute('data-motion') === 'off' || session?.hidden) remove();
  });
  function remove() {
    clearTimeout(timer);
    observer.disconnect();
    ghost.remove();
  }
  try {
    ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: style.getPropertyValue('--ease-exit').trim(), fill: 'forwards' });
    timer = setTimeout(remove, duration);
    observer.observe(root, { attributes: true, attributeFilter: ['data-motion'] });
    if (session) observer.observe(session, { attributes: true, attributeFilter: ['hidden'] });
  } catch { remove(); }
}
