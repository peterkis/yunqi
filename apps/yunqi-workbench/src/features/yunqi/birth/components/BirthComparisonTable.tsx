import { ElementDot } from '../../../../components/design/ElementDot';
import { RelationChip } from '../../../../components/design/RelationChip';
import { YunQiTimeDisplay } from '../../../../components/time/YunQiTimeDisplay';
import { RelationSourceLinks } from '../../components/RelationSourceLinks';
import type { BirthCandidateViewModel, BirthFactViewModel, BirthPageViewModel } from '../presentation/map-birth-view';

function Fact({ value }: { readonly value: BirthFactViewModel }) {
  return <>
    <div className="birth-table__value">
      {value.element ? <ElementDot compact element={value.element} label={value.label} /> : value.label}
    </div>
    {value.detail.map((line) => <p className="birth-table__detail" key={line}>{line}</p>)}
  </>;
}

export function BirthComparisonTable({ candidate, current }: {
  readonly candidate: BirthCandidateViewModel;
  readonly current: Pick<BirthPageViewModel, 'currentGanzhi' | 'currentYear' | 'currentTime'>;
}) {
  return <>
    <table className="birth-table" aria-label={`${candidate.label} · 先天与当下并列对照`}>
      <thead>
        <tr className="birth-table__columns">
          <td />
          <th scope="col"><span className="birth-label">先天 · 出生</span><span className="birth-table__year"><strong>{candidate.birthGanzhi}</strong><span>{candidate.birthYear}</span></span></th>
          <th scope="col"><span className="birth-label">当下 · 今日</span><span className="birth-table__year"><strong>{current.currentGanzhi}</strong><span>{current.currentYear}</span></span><span className="birth-table__time"><YunQiTimeDisplay value={current.currentTime} variant="compact" /></span></th>
        </tr>
      </thead>
      {candidate.rows.map((row) => (
        <tbody key={row.label} className="birth-table__dimension">
          <tr className="birth-table__columns">
            <th scope="row" className="birth-label">{row.label}</th>
            <td><Fact value={row.birth} /></td>
            <td><Fact value={row.current} /></td>
          </tr>
          <tr className="birth-table__columns birth-table__relation">
            <td />
            <td colSpan={2}>
              {row.relation
                ? <RelationChip compact tone={row.relation.tone} label={row.relation.label} explanation={row.relation.relation} />
                : <p className="birth-note">此维度暂未返回关系说明。</p>}
            </td>
          </tr>
        </tbody>
      ))}
    </table>
    <details className="birth-relation-details">
      <summary>这些关系怎么读？</summary>
      {candidate.rows.map((row) => row.relation ? <div key={row.label}>
        <h4 className="birth-label">{row.label} · {row.relation.label}</h4>
        <p>{row.relation.explanation}</p>
        <RelationSourceLinks sources={row.relation.sources} />
      </div> : null)}
    </details>
  </>;
}
