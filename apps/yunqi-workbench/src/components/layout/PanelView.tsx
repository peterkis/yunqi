import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react';

export interface PanelViewOptions {
  readonly actions?: ReactNode;
  readonly drilldown?: { readonly title: string; readonly onBack: () => void; readonly toolbarActions?: ReactNode };
}

export const PanelViewContext = createContext<
  ((view: PanelViewOptions | undefined) => void) | undefined
>(undefined);

/** The visible session owns the shell's actions and optional result navigation.
 * Hidden readers and expanded birth inputs release the session's shell slots. */
export function PanelView({ actions, drilldown, enabled = true }: PanelViewOptions & { readonly enabled?: boolean }) {
  const publish = useContext(PanelViewContext);
  useLayoutEffect(() => {
    if (!enabled) return;
    publish?.({ actions, drilldown });
    return () => publish?.(undefined);
  }, [publish, enabled, actions, drilldown]);
  return null;
}
