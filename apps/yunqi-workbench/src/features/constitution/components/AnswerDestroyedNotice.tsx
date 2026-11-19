import { useEffect, useState } from 'react';
import { useMotionLevel } from '../../../providers/MotionProvider';
import { useSessionVisible } from '../../../components/layout/SessionVisibility';

export function AnswerDestroyedNotice() {
  const level = useMotionLevel();
  const visible = useSessionVisible();
  const [dismissed, setDismissed] = useState(false);
  const [removed, setRemoved] = useState(false);
  useEffect(() => {
    if (!visible) { setRemoved(true); return; }
    if (removed) return;
    const dismiss = setTimeout(() => setDismissed(true), 3000);
    const remove = setTimeout(() => setRemoved(true), 3000 + (level === 'off' ? 0 : 120));
    return () => { clearTimeout(dismiss); clearTimeout(remove); };
  }, [level, visible, removed]);
  return removed ? null : <p role="status" className="constitution-destroyed-notice constitution-notice" data-dismissed={dismissed}>答卷已销毁</p>;
}
