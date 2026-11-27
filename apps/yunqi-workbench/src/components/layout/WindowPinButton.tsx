import { useEffect, useState } from 'react';
import { Button } from '../design/Button';

export interface WindowPin {
  read(): Promise<boolean>;
  set(pinned: boolean): Promise<boolean>;
  subscribe(notify: (pinned: boolean) => void): Promise<() => void>;
}

export function WindowPinButton({ pin }: { readonly pin: WindowPin }) {
  const [pinned, setPinned] = useState<boolean>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    async function synchronize() {
      const stop = await pin.subscribe(value => { if (active) setPinned(value); });
      if (!active) { stop(); return; }
      unsubscribe = stop;
      const value = await pin.read();
      if (active) setPinned(value);
    }
    void synchronize().catch(() => { if (active) setError(true); });
    return () => { active = false; unsubscribe?.(); };
  }, [pin]);

  async function toggle() {
    setPending(true);
    setError(false);
    try {
      const current = pinned ?? await pin.read();
      setPinned(await pin.set(!current));
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return <>
    <Button variant="icon" aria-label="窗口置顶" aria-pressed={pinned ?? false}
      title={pinned ? '取消窗口置顶' : '将窗口置顶'} disabled={pending || (pinned === undefined && !error)} onClick={toggle}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 17v5" />
        <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
      </svg>
    </Button>
    {error && <span role="alert">置顶设置失败，请重试</span>}
  </>;
}
