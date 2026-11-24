import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../../../components/design/Button';
import { useSessionVisible } from '../../../components/layout/SessionVisibility';

interface Props {
  readonly confirming: boolean;
  readonly disabled: boolean;
  readonly onRequest: () => void;
  readonly onCancel: () => void;
  readonly onDestroy: () => void;
  readonly children: ReactNode;
}

export function ConstitutionActionBar({ confirming, disabled, onRequest, onCancel, onDestroy, children }: Props) {
  const visible = useSessionVisible();
  const bar = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const restoreTriggerFocus = useRef(false);

  useLayoutEffect(() => {
    if (!visible) return;
    if (confirming) cancel.current?.focus({ preventScroll: true });
    else if (restoreTriggerFocus.current) trigger.current?.focus({ preventScroll: true });
    restoreTriggerFocus.current = false;
  }, [confirming, visible]);

  useEffect(() => {
    const row = bar.current;
    if (!confirming || !visible || !row) return;
    const doc = row.ownerDocument;
    const dismissOutside = (event: MouseEvent) => {
      if (!event.composedPath().includes(row)) onCancel();
    };
    doc.addEventListener('click', dismissOutside, true);
    return () => doc.removeEventListener('click', dismissOutside, true);
  }, [confirming, visible, onCancel]);

  function cancelAndReturnFocus() {
    restoreTriggerFocus.current = true;
    onCancel();
  }

  return <div ref={bar} className="constitution-actions" data-confirming={confirming || undefined} onKeyDown={event => {
    if (confirming && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancelAndReturnFocus();
    }
  }}>
    {confirming ? <div key="confirm" className="constitution-actions__state" role="group" aria-label="销毁本次答卷与结果？">
      <span className="constitution-actions__prompt">销毁本次答卷与结果？</span>
      <Button ref={cancel} variant="text" onClick={cancelAndReturnFocus}>取消</Button>
      <Button variant="secondary" data-confirm-destroy onClick={onDestroy}>确认销毁</Button>
    </div> : <div key="edit" className="constitution-actions__state">
      {children}
      <Button ref={trigger} variant="secondary" data-request-destroy disabled={disabled} onClick={onRequest}>
        <Trash2 aria-hidden="true" />结束并销毁
      </Button>
    </div>}
  </div>;
}
