import { flushSync } from 'react-dom';
import type { InFlightProbeHandle } from '../lib/in-flight-motion-probe';
import type { MotionLevel } from '../providers/MotionProvider';

export interface ViewTransitionHooks {
  readonly onStart?: () => InFlightProbeHandle | undefined;
}

/** Commit once, including when the browser rejects/skips a transition. */
export function updateWithViewTransition(
  update: () => void,
  level: MotionLevel,
  hooks?: ViewTransitionHooks,
): void {
  let committed = false;
  let probe: InFlightProbeHandle | undefined;
  const commit = () => {
    if (committed) return;
    committed = true;
    // Flush even when update queues a React change and subsequently throws.
    try {
      flushSync(update);
    } finally {
      probe?.markActive();
    }
  };

  if (level !== 'full' || typeof document.startViewTransition !== 'function') {
    commit();
    return;
  }

  try {
    probe = hooks?.onStart?.();
    const transition = document.startViewTransition(commit);
    // Handle rejection without gating navigation or reading animation completion.
    void transition.ready.then(
      () => { probe?.markActive(); },
      () => { probe?.cancel(); },
    );
    void transition.updateCallbackDone.catch(() => { if (!committed) commit(); });
  } catch {
    probe?.cancel();
    if (!committed) commit();
  }
}
