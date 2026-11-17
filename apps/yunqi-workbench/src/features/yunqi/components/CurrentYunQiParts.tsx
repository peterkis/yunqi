import { ElementDot } from '../../../components/design/ElementDot';
import { RelationChip } from '../../../components/design/RelationChip';
import { YunQiTimeDisplay } from '../../../components/time/YunQiTimeDisplay';
import type { LearningRelationViewModel } from '../presentation/map-learning';
import type { ElementKind, YunQiTimeViewModel } from '../presentation/view-model';
import { RelationSourceLinks } from './RelationSourceLinks';

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
    <YunQiTimeDisplay value={start} variant="compact" showStandard={false} />
    <span aria-hidden="true"> → </span>
    <span className="visually-hidden">至</span>
    <YunQiTimeDisplay value={end} variant="compact" showStandard={false} />
  </span>;
}

export function CurrentRelation({ relation }: { readonly relation: LearningRelationViewModel }) {
  return <RelationChip label={relation.label} tone={relation.tone} explanation={relation.relation} />;
}

export function CurrentRelationReading({ relation }: { readonly relation: LearningRelationViewModel }) {
  return <section className="current-relation-reading" aria-label={relation.title}>
    <h4>{relation.title}</h4>
    <p>{relation.explanation}</p>
    <RelationSourceLinks sources={relation.sources} />
  </section>;
}
