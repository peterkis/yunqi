import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../../../../components/design/Button';
import { ConstitutionAssessmentPanel } from '../../../constitution/components/ConstitutionAssessmentPanel';
import { mapConstitutionContext } from '../../../constitution/presentation/map-constitution';
import type { BirthComparisonViewModel } from '../../presentation/map-learning';

export function BirthAssessmentSession({ comparison }: { readonly comparison: BirthComparisonViewModel }) {
  const [active, setActive] = useState(false);
  const panelId = useId();
  const actionRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const wasActive = useRef(false);

  useEffect(() => {
    if (active) headingRef.current?.focus();
    else if (wasActive.current) actionRef.current?.focus();
    wasActive.current = active;
  }, [active]);

  return (
    <section className="birth-session" aria-label="本次对照体质测评">
      <header className="birth-session-header">
        <Button variant="primary" ref={actionRef} aria-expanded={active} aria-controls={active ? panelId : undefined} hidden={active} onClick={() => setActive(true)}>同时测评体质</Button>
      </header>
      <p className="birth-note">问卷按需打开。结束测评、修改出生资料、清空或重新对照，都会清除本次作答和测评结果。</p>
      {active ? (
        <div className="birth-constitution" id={panelId}>
          <h3 className="birth-assessment-heading" tabIndex={-1} ref={headingRef}>本次体质测评</h3>
          <ConstitutionAssessmentPanel context={mapConstitutionContext(comparison.current, comparison)} onEnd={() => setActive(false)} />
        </div>
      ) : null}
    </section>
  );
}
