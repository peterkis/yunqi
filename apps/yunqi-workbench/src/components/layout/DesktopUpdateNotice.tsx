import { useEffect, useState } from 'react';
import { Button } from '../design/Button';

export interface DesktopUpdateStatus {
  readonly version: string | null;
  readonly digest: string | null;
  readonly scheduled: boolean;
  readonly failed: boolean;
}

export interface DesktopUpdates {
  read(): Promise<DesktopUpdateStatus>;
  choose(digest: string, action: 'now' | 'next'): Promise<void>;
  subscribe(notify: () => void): Promise<() => void>;
}

export function DesktopUpdateNotice({ updates }: { readonly updates: DesktopUpdates }) {
  const [status, setStatus] = useState<DesktopUpdateStatus>();
  const [focused, setFocused] = useState(() => document.hasFocus());
  const [dismissed, setDismissed] = useState<string>();
  const [confirming, setConfirming] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    let generation = 0;
    const refresh = () => {
      const read = ++generation;
      void updates.read().then(value => {
        if (!disposed && read === generation) setStatus(value);
      }).catch(() => {});
    };
    const focus = () => { setFocused(true); refresh(); };
    const blur = () => setFocused(false);
    window.addEventListener('focus', focus);
    window.addEventListener('blur', blur);
    void updates.subscribe(refresh).then(stop => {
      if (disposed) stop();
      else unlisten = stop;
    }).catch(() => {});
    refresh();
    return () => {
      disposed = true;
      unlisten?.();
      window.removeEventListener('focus', focus);
      window.removeEventListener('blur', blur);
    };
  }, [updates]);

  const version = status?.version;
  const digest = status?.digest;
  const notice = status?.failed ? 'failed' : digest;
  if (!focused || !notice || notice === dismissed) return null;

  async function choose(selected: string, action: 'now' | 'next') {
    setBusy(true);
    setError(false);
    try {
      await updates.choose(selected, action);
      setStatus(await updates.read());
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  const close = () => setDismissed(notice);
  const confirm = digest && confirming === digest;
  return (
    <section className="panel-update-notice" aria-label="软件更新">
      <p role="status">
        {error ? '更新暂不可安装，当前版本可继续使用。'
          : confirm ? '重启将结束当前会话，请在完成操作后更新。'
            : status?.failed ? '上次更新未完成。可继续使用，或联系信息科。'
              : status?.scheduled ? '已预约下次启动时安装'
                : '运气通 ' + version + ' 已下载'}
      </p>
      <div className="panel-update-notice__actions">
        {digest && confirm ? <>
          <Button variant="secondary" disabled={busy} onClick={() => { void choose(digest, 'now'); }}>确认重启</Button>
          <Button variant="text" disabled={busy} onClick={() => setConfirming(undefined)}>取消</Button>
        </> : digest && !status?.scheduled && !status?.failed ? <>
          <Button variant="secondary" disabled={busy} onClick={() => setConfirming(digest)}>重启并更新</Button>
          <Button variant="text" disabled={busy} onClick={() => { void choose(digest, 'next'); }}>下次启动时安装</Button>
          <Button variant="text" disabled={busy} onClick={close}>稍后</Button>
        </> : <Button variant="text" onClick={close}>关闭提示</Button>}
      </div>
    </section>
  );
}
