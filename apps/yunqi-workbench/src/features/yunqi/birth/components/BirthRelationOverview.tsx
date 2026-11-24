import { RelationSources } from '../../components/RelationSources';
import { birthRelationOverview } from '../presentation/birth-relation-overview';
import type { BirthRowViewModel } from '../presentation/map-birth-view';

const groups = [
  ['相克', 'adverse'], ['相生', 'favorable'], ['同五行', 'neutral'],
] as const;

export function BirthRelationOverview({ rows }: { readonly rows: readonly BirthRowViewModel[] }) {
  const { entries, counts, explanations, sources } = birthRelationOverview(rows);
  const title = rows.length === 3 ? '三维生克总览' : '五维生克总览';
  return <>
    <div className="birth-matrix jade-card">
      <header>
        <h4>{title}</h4>
        <div className="birth-matrix__counts">
          {groups.map(([group, tone]) => counts[group] > 0 &&
            <span className="birth-matrix__pill" data-tone={tone} key={group}>{counts[group]}项{group}</span>)}
        </div>
      </header>
      <table aria-label={title}>
        <thead className="visually-hidden"><tr><th scope="col">维度</th><th scope="col">作用方向</th><th scope="col">关系</th></tr></thead>
        <tbody>{entries.map(entry => <tr key={entry.dimension}>
          <th scope="row"><span className="birth-matrix__dimension">{entry.dimension}</span></th>
          <td>{entry.direction}</td>
          <td><span className="birth-matrix__pill" data-tone={entry.tone}>{entry.label}</span></td>
        </tr>)}</tbody>
      </table>
    </div>
    {explanations.size > 0 && <div className="birth-matrix__principles">
      <h5>解读原则</h5>
      {[...explanations].map(([text, dimensions]) => <p key={text}>
        {dimensions.length !== rows.length && <strong>{dimensions.join('、')} · </strong>}{text}
      </p>)}
    </div>}
    <RelationSources sources={sources} />
  </>;
}
