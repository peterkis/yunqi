import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

interface FloatingConfirmHudProps {
  readonly id: string;
  readonly open: boolean;
  readonly message: string;
  readonly trigger: RefObject<HTMLButtonElement | null>;
  readonly onDismiss: () => void;
  readonly onConfirm: () => void;
}

export function FloatingConfirmHud({ id, open, message, trigger, onDismiss, onConfirm }: FloatingConfirmHudProps) {
  const hud = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (open) cancel.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    const node = hud.current;
    if (!open || !node) return;
    const doc = node.ownerDocument;
    const dismissOutside = (event: Event) => {
      const path = event.composedPath();
      if (path.includes(node) || (trigger.current && path.includes(trigger.current))) return;
      onDismiss();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      onDismiss();
      trigger.current?.focus({ preventScroll: true });
    };
    // A pointer dismisses before activation. Click also covers assistive activation.
    doc.addEventListener('pointerdown', dismissOutside, true);
    doc.addEventListener('click', dismissOutside, true);
    doc.addEventListener('focusin', dismissOutside, true);
    doc.addEventListener('keydown', escape);
    return () => {
      doc.removeEventListener('pointerdown', dismissOutside, true);
      doc.removeEventListener('click', dismissOutside, true);
      doc.removeEventListener('focusin', dismissOutside, true);
      doc.removeEventListener('keydown', escape);
    };
  }, [open, onDismiss, trigger]);

  function cancelAndRestoreFocus() {
    onDismiss();
    trigger.current?.focus({ preventScroll: true });
  }

  return <div ref={hud} id={id} role="alertdialog" aria-modal="false" aria-labelledby={id + '-message'}
    className="constitution-sex-confirmation" hidden={!open} inert={!open} aria-hidden={!open}>
    <p id={id + '-message'}>{message}</p>
    <button type="button" ref={cancel} onClick={cancelAndRestoreFocus}>取消</button>
    <button type="button" className="constitution-sex-confirmation__confirm" onClick={onConfirm}>确认</button>
  </div>;
}
