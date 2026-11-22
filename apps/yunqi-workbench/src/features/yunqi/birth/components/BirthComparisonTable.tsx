import { useId } from 'react';
import { ElementDot } from '../../../../components/design/ElementDot';
import { InlineText } from '../../../../components/design/InlineText';
import { RelationChip } from '../../../../components/design/RelationChip';
import { YunQiTimeDisplay } from '../../../../components/time/YunQiTimeDisplay';
import { RelationSourceLinks } from '../../components/RelationSourceLinks';
import { RelationReadingSummary } from '../../components/RelationReadingSummary';
import type { BirthCandidateViewModel, BirthFactViewModel, BirthPageViewModel } from '../presentation/map-birth-view';

function Fact({ value }: { readonly value: BirthFactViewModel }) {
  return <>
    <div className="birth-table__value">
      {value.element ? <ElementDot compact element={value.element} label={value.label} /> : value.label}
    </div>
    {value.detail.length > 0 && <div className="birth-table__detail">
      {value.detail.map(line => <div key={line}>{line}</div>)}
    </div>}
  </>;
}

export function BirthComparisonTable({ candidate, current }: {
  readonly candidate: BirthCandidateViewModel;
  readonly current: Pick<BirthPageViewModel, 'currentGanzhi' | 'currentYear' | 'currentTime'>;
}) {
  const tableId = useId();
  const birthColumnId = `${tableId}-birth`;
  const relationColumnId = `${tableId}-relation`;
  const currentColumnId = `${tableId}-current`;

  return <>
    <table className="birth-table" aria-label={`${candidate.label} · 先天与当下并列对照`}>
      <thead>
        <tr className="birth-table__columns">
          <th scope="col" id={birthColumnId} className="birth-table__birth"><span className="birth-label">先天</span><span className="birth-table__year"><strong>{candidate.birthGanzhi}</strong></span></th>
          <th scope="col" id={relationColumnId} className="birth-table__axis-label">关系</th>
          <th scope="col" id={currentColumnId} className="birth-table__current"><span className="birth-label">当下</span><span className="birth-table__year"><strong>{current.currentGanzhi}</strong></span></th>
        </tr>
      </thead>
      <tbody>
        {candidate.rows.map((row, index) => {
          const rowId = `${tableId}-${index}`;
          // Name each row in reading order, with explicit cell/header associations
          // because the row heading sits in the visual centre of the table.
          return <tr key={row.label} className="birth-table__columns birth-table__dimension"
            aria-labelledby={`${rowId}-label ${rowId}-birth ${rowId}-relation ${row.relation ? `${rowId}-explanation ` : ''}${rowId}-current`}>
            <td id={`${rowId}-birth`} headers={`${rowId}-heading ${birthColumnId}`} className="birth-table__birth"><Fact value={row.birth} /></td>
            <th scope="row" id={`${rowId}-heading`} headers={relationColumnId} aria-labelledby={`${rowId}-label`} className="birth-table__axis">
              <span id={`${rowId}-label`} className="birth-table__dimension-label">{row.label}</span>
              <span className="birth-table__relation">
                {row.relation ? <>
                  <span id={`${rowId}-relation`}><RelationChip compact tone={row.relation.tone} label={row.relation.label} /></span>
                  <span id={`${rowId}-explanation`} className="visually-hidden">{row.relation.relation}</span>
                </> : <span id={`${rowId}-relation`} className="birth-note">此维度暂未返回关系说明。</span>}
              </span>
            </th>
            <td id={`${rowId}-current`} headers={`${rowId}-heading ${currentColumnId}`} className="birth-table__current"><Fact value={row.current} /></td>
          </tr>;
        })}
      </tbody>
    </table>
    <div className="birth-table__meta">
      <p className="birth-table__years birth-note num"><InlineText>{`运气年：先天 ${candidate.birthYear} · 当下 ${current.currentYear}`}</InlineText></p>
      <p className="birth-table__time birth-note">当下时刻：<YunQiTimeDisplay value={current.currentTime} variant="month-day" showStandard={false} /></p>
    </div>
    <details className="birth-relation-details">
      <RelationReadingSummary />
      {candidate.rows.map((row) => row.relation ? <div key={row.label}>
        <h4 className="birth-label"><InlineText>{`${row.label} · ${row.relation.label}`}</InlineText></h4>
        <p>{row.relation.explanation}</p>
        <RelationSourceLinks sources={row.relation.sources} />
      </div> : null)}
    </details>
  </>;
}
