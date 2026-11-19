import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ConstitutionProgressViewModel } from '../presentation/map-constitution';
import { useSessionVisible } from '../../../components/layout/SessionVisibility';

export function ConstitutionDimension({ dimension }: { readonly dimension: ConstitutionProgressViewModel['dimensions'][number] }) {
  const complete = dimension.count === '✓';
  const wasComplete = useRef(complete);
  const [emphasized, setEmphasized] = useState(false);
  const visible = useSessionVisible();
  useEffect(() => {
    const newlyComplete = complete && !wasComplete.current;
    wasComplete.current = complete;
    if (!visible) { setEmphasized(false); return; }
    if (!newlyComplete) return;
    setEmphasized(true);
    const timer = setTimeout(() => setEmphasized(false), 600);
    return () => clearTimeout(timer);
  }, [complete, visible]);
  return <div role="listitem" data-current={dimension.current} data-answered={dimension.answered} data-emphasized={emphasized}>
    <span className="constitution-dimension-name">{dimension.shortName}</span>
    <span className="constitution-dimension-track" role="img" aria-label={dimension.label} style={{ '--constitution-progress': dimension.fillWidth } as CSSProperties}><span /></span>
    <span className="constitution-dimension-count num">{complete ? <span className="constitution-dimension-check">✓</span> : dimension.count}</span>
  </div>;
}
