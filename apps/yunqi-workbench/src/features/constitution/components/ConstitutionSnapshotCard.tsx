import { Check } from 'lucide-react';
import { YunQiTimeDisplay } from '../../../components/time/YunQiTimeDisplay';
import { CurrentElementValue } from '../../yunqi/components/CurrentYunQiParts';
import type { ConstitutionContextViewModel } from '../presentation/map-constitution';

type BirthContext = NonNullable<ConstitutionContextViewModel['birth']>;
type Candidate = BirthContext['candidates'][number];
type SnapshotProps =
  | { readonly kind: 'current'; readonly facts: ConstitutionContextViewModel['current'] }
  | { readonly kind: 'birth'; readonly facts: Candidate; readonly precision: BirthContext['precision']; readonly ambiguous: boolean };

const annualMetrics = [['suiYun', '岁运'], ['sitian', '司天'], ['zaiquan', '在泉']] as const;

export function ConstitutionSnapshotCard(props: SnapshotProps) {
  const { annual, stages } = props.facts;
  const birth = props.kind === 'birth' ? props : undefined;
  const title = birth ? '先天快照' : '当下快照';
  const boundaryDay = birth?.precision === 'date' && birth.ambiguous;
  const timeFormat = birth?.precision === 'year' ? 'year-minute' : 'compact';
  return <section className={birth ? 'constitution-snapshot constitution-birth-candidate jade-card' : 'constitution-snapshot jade-card'}
    data-kind={props.kind} aria-label={birth?.facts.label ?? title}>
    <header className="constitution-snapshot__header">
      <h4>{title}</h4>
      {birth && <span className="constitution-snapshot__badge" data-boundary={boundaryDay || undefined}>
        {birth.precision === 'date' && !boundaryDay && <Check aria-hidden="true" />}
        {boundaryDay && '交界日 · '}{birth.facts.label}
      </span>}
    </header>
    <dl className="constitution-snapshot__annual">
      {annualMetrics.map(([key, label]) => <div key={key}>
        <dt>{label}</dt><dd><CurrentElementValue {...annual[key]} /></dd>
      </div>)}
    </dl>
    {stages.length > 0 && <dl className="constitution-snapshot__stages">
      {stages.map(stage => <div key={stage.name}>
        <dt>{stage.name}</dt>
        <dd><span>主</span><CurrentElementValue {...stage.host} /></dd>
        <dd><span>客</span><CurrentElementValue {...stage.guest} /></dd>
      </div>)}
    </dl>}
    {props.kind === 'current' && <footer className="constitution-snapshot__interval">
      <span>快照时刻</span>
      <span className="constitution-snapshot__times"><YunQiTimeDisplay value={props.facts.time} /></span>
    </footer>}
    {birth && <footer className="constitution-snapshot__interval">
      <span>{birth.precision === 'time' ? '出生时刻：' : '可能区间'}</span>
      <span className="constitution-snapshot__times">
        <YunQiTimeDisplay value={birth.facts.from} variant={timeFormat} />
        {birth.precision !== 'time' && <><span aria-hidden="true">→</span><span className="visually-hidden">至</span>
          <YunQiTimeDisplay value={birth.facts.until} variant={timeFormat} /></>}
      </span>
    </footer>}
  </section>;
}
