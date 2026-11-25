import { ElementDot } from '../../../components/design/ElementDot';
import { RelationChip } from '../../../components/design/RelationChip';
import { YunQiTimeDisplay } from '../../../components/time/YunQiTimeDisplay';
import type { LearningRelationViewModel, ScopedLearningRelation } from '../presentation/map-learning';
import type { ElementKind, YunQiTimeViewModel } from '../presentation/view-model';
import { RelationSources } from './RelationSources';

export function CurrentElementValue({ element, label }: {
  readonly element: ElementKind | undefined;
  readonly label: string;
}) {
  return element ? <ElementDot element={element} label={label} /> : <span>{label}</span>;
}

export function CurrentTimeRange({ start, end }: {
  readonly start: YunQiTimeViewModel;
  readonly end: YunQiTimeViewModel;
}) {
  return <span className="current-time-range">
    <YunQiTimeDisplay value={start} variant="compact" />
    <span aria-hidden="true"> → </span>
    <span className="visually-hidden">至</span>
    <YunQiTimeDisplay value={end} variant="compact" />
  </span>;
}

export function CurrentRelation({ relation }: { readonly relation: LearningRelationViewModel }) {
  return <RelationChip label={relation.label} tone={relation.tone} explanation={relation.relation} />;
}

export function CurrentRelationReading({ relation }: { readonly relation: ScopedLearningRelation }) {
  return <section className="current-relation-reading" aria-label={relation.title}>
    <header className="current-relation-reading__head">
      <span className="current-relation-reading__scope">{relation.scope}</span>
      <h4>{relation.heading}</h4>
      <RelationChip compact tone={relation.tone} label={relation.badgeLabel} />
    </header>
    <p>{relation.explanation}</p>
    <RelationSources sources={relation.sources} />
  </section>;
}
