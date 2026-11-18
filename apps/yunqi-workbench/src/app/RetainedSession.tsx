import { useContext, useState, type ReactNode } from 'react';
import { PanelSummaryContext } from '../components/layout/PanelSummary';
import { PanelViewContext } from '../components/layout/PanelView';
import { SessionVisibility } from '../components/layout/SessionVisibility';

/** Lazy on first visit, retained only until the application unmounts. Hidden
 * tabs release their shell slots and never write session data to storage. */
export function RetainedSession({ active, children }: { readonly active: boolean; readonly children: ReactNode }) {
  const [visited, setVisited] = useState(active);
  const publishView = useContext(PanelViewContext);
  const publishSummary = useContext(PanelSummaryContext);
  if (active && !visited) setVisited(true);
  if (!active && !visited) return null;
  return <SessionVisibility.Provider value={active}>
    <PanelViewContext.Provider value={active ? publishView : undefined}>
      <PanelSummaryContext.Provider value={active ? publishSummary : undefined}>
        <div className="retained-session" hidden={!active} inert={!active || undefined}>{children}</div>
      </PanelSummaryContext.Provider>
    </PanelViewContext.Provider>
  </SessionVisibility.Provider>;
}
