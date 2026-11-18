import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../../../../components/design/Button';
import { PanelView } from '../../../../components/layout/PanelView';
import { ConstitutionAssessmentPanel } from '../../../constitution/components/ConstitutionAssessmentPanel';
import { mapConstitutionContext } from '../../../constitution/presentation/map-constitution';
import type { BirthComparisonViewModel } from '../../presentation/map-learning';

export function BirthAssessmentSession({ comparison, actionsEnabled = true }: { readonly comparison: BirthComparisonViewModel; readonly actionsEnabled?: boolean }) {
  const [active, setActive] = useState(false);
  const panelId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const restoreActionFocus = useRef(false);

  useEffect(() => {
    if (active) headingRef.current?.focus();
  }, [active]);

  function end() {
    restoreActionFocus.current = true;
    setActive(false);
  }

  function focusStart(button: HTMLButtonElement | null) {
    // PanelView publishes the action into a later shell commit.
    if (button && restoreActionFocus.current) {
      restoreActionFocus.current = false;
      button.focus();
    }
  }

  return (
    <section className="birth-session" id={panelId} aria-label="本次对照体质测评">
      {!active ? <PanelView enabled={actionsEnabled} actions={<div className="birth-actions">
        <Button ref={focusStart} aria-expanded={false} aria-controls={panelId} onClick={() => setActive(true)}>同时测评体质</Button>
      </div>} /> : null}
      <p className="birth-note">问卷按需打开。结束测评、修改出生资料、清空或重新对照，都会清除本次作答和测评结果。</p>
      {active ? (
        <div className="birth-constitution">
          <h3 className="birth-assessment-heading" tabIndex={-1} ref={headingRef}>本次体质测评</h3>
          <ConstitutionAssessmentPanel context={mapConstitutionContext(comparison.current, comparison)} onEnd={end} actionsEnabled={actionsEnabled} />
        </div>
      ) : null}
    </section>
  );
}
