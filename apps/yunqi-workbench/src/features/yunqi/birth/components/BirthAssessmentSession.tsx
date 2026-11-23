import { useEffect, useRef } from 'react';
import { PanelSummary } from '../../../../components/layout/PanelSummary';
import { ConstitutionAssessmentPanel } from '../../../constitution/components/ConstitutionAssessmentPanel';
import { mapConstitutionContext } from '../../../constitution/presentation/map-constitution';
import { mapPanelSummary } from '../../presentation/panel-summary';
import type { BirthSessionComparison } from '../../presentation/map-learning';

export function BirthAssessmentSession({ comparison, onEnd }: {
  readonly comparison: BirthSessionComparison;
  readonly onEnd: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const { current } = comparison;
  useEffect(() => { heading.current?.focus(); }, []);
  return <section className="constitution-page birth-session" aria-label="本次对照体质测评">
    <PanelSummary viewModel={mapPanelSummary(current.facts.summary, { step: current.facts.currentStep, relation: current.currentQi })} />
    <h2 className="visually-hidden" tabIndex={-1} ref={heading}>本次体质测评</h2>
    <ConstitutionAssessmentPanel context={mapConstitutionContext(current, comparison)} onEnd={onEnd} />
  </section>;
}
