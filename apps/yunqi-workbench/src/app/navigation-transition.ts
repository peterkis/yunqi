import { flushSync } from 'react-dom';
import type { MotionLevel } from '../providers/MotionProvider';

/** Commit once, including when the browser rejects/skips a transition. This
 * infrastructure does not opt any route into a visual transition yet. */
export function updateWithViewTransition(update: () => void, level: MotionLevel): void {
  let committed = false;
  const commit = () => {
    if (committed) return;
    committed = true;
    // Flush even when update queues a React change and subsequently throws.
    flushSync(update);
  };

  if (level !== 'full' || typeof document.startViewTransition !== 'function') {
    commit();
    return;
  }

  try {
    const transition = document.startViewTransition(commit);
    // Handle rejection without gating navigation or reading animation completion.
    void transition.ready.catch(() => {});
    void transition.updateCallbackDone.catch(() => { if (!committed) commit(); });
  } catch {
    if (!committed) commit();
  }
}
