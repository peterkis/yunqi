import { InlineText } from '../../../components/design/InlineText';
import { RelationChip } from '../../../components/design/RelationChip';
import type { LearningViewModel } from '../presentation/map-learning';
import type { ElementKind, RelationTone, StageProgressViewModel } from '../presentation/view-model';
import { CurrentElementValue } from './CurrentYunQiParts';

interface PeriodColumnProps {
  readonly label: string;
  readonly column: 1 | 3;
  readonly name: string;
  readonly progress: StageProgressViewModel;
  readonly host: { readonly label: string; readonly value: string; readonly element: ElementKind | undefined };
  readonly guest: { readonly label: string; readonly value: string; readonly element: ElementKind | undefined };
  readonly relation: { readonly label: string; readonly tone: RelationTone; readonly explanation: string };
}

function PeriodColumn({ label, column, name, progress, host, guest, relation }: PeriodColumnProps) {
  return <section className="current-period-column" aria-label={label}>
    <div className="current-period-cell current-period-cell--title" style={{ gridColumn: column, gridRow: 1 }}><h3>{name}</h3></div>
    <div className="current-period-cell current-period-cell--range num" style={{ gridColumn: column, gridRow: 2 }}>{progress.rangeLabel}</div>
    <div className="current-period-cell current-period-cell--remaining num" style={{ gridColumn: column, gridRow: 3 }}>{progress.remainingLabel}</div>
    <div className="current-period-cell current-period-cell--value current-period-cell--host" style={{ gridColumn: column, gridRow: 4 }}>
      <span className="current-meta">{host.label}</span><CurrentElementValue element={host.element} label={host.value} />
    </div>
    <div className="current-period-cell current-period-cell--value" style={{ gridColumn: column, gridRow: 5 }}>
      <span className="current-meta">{guest.label}</span><CurrentElementValue element={guest.element} label={guest.value} />
    </div>
    <div className="current-period-cell current-period-cell--relation" style={{ gridColumn: column, gridRow: 6 }}>
      <RelationChip label={relation.label} tone={relation.tone} />
    </div>
    <div className="current-period-cell current-period-cell--explanation" style={{ gridColumn: column, gridRow: 7 }}>
      {relation.explanation && <span className="ds-relation__explanation"><InlineText>{relation.explanation}</InlineText></span>}
    </div>
  </section>;
}

export function CurrentPeriodGrid({ learning }: { readonly learning: LearningViewModel }) {
  const qi = learning.facts.currentStep;
  const movement = learning.currentMovement;
  return <div className="current-period-grid">
    <span className="current-period-grid__divider" aria-hidden="true" />
    <PeriodColumn label="当步气" column={1} name={qi.name} progress={learning.facts.currentStepProgress}
      host={{ label: '主气', value: qi.hostQi, element: qi.hostElement }}
      guest={{ label: '客气', value: qi.guestQi, element: qi.guestElement }}
      relation={{ label: learning.currentQi.label, tone: learning.currentQi.tone, explanation: learning.currentQi.relation }} />
    <PeriodColumn label="当步运" column={3} name={movement.name} progress={learning.currentMovementProgress}
      host={{ label: '主运', value: movement.hostValue, element: movement.hostElement }}
      guest={{ label: '客运', value: movement.guestValue, element: movement.guestElement }} relation={movement.relation} />
  </div>;
}
