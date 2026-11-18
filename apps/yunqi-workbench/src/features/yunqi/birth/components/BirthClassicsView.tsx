import { useState } from 'react';
import { YunQiTimeDisplay } from '../../../../components/time/YunQiTimeDisplay';
import { ClassicsReadingCard, ClassicsReadingNotice } from '../../components/ClassicsReadingCard';
import type { BirthPageViewModel, BirthReadingViewModel } from '../presentation/map-birth-view';

export const BIRTH_NOTICE = '出生时令结构不等于体质，原文病候是文献线索而非发病预测。请与体质量表、四诊互参。';

function Reading({ value }: { readonly value: BirthReadingViewModel }) {
  return <ClassicsReadingCard reading={value.card} />;
}

/** Shared reading cards and compact range navigation follow prototype board ②.
 * The birth scope is supplied by the mapper, never inferred from today's stage. */
export function BirthClassicsView({ viewModel }: { readonly viewModel: BirthPageViewModel }) {
  const [scope, setScope] = useState<'annual' | 'period'>('period');
  return (
    <section className="birth-classics" aria-label="先天原文与释义">
      <h2 className="visually-hidden">先天原文与释义</h2>
      <nav className="birth-reading-nav" aria-label="出生原文范围">
        <button type="button" aria-pressed={scope === 'annual'} onClick={() => setScope('annual')}>全年</button>
        <button type="button" aria-pressed={scope === 'period'} onClick={() => setScope('period')}>出生阶段</button>
      </nav>
      <div className="birth-classics__readings" role="region" aria-label="出生原文阅读区" tabIndex={0}>
      {viewModel.candidates.map((candidate, index) => {
        const readings = scope === 'annual' ? candidate.annualReadings : candidate.periodReadings;
        return <section className="birth-reading-candidate" key={`${candidate.from.localTime}-${index}`} aria-label={`${candidate.label}原文`}>
          <h3 className="birth-label">{candidate.label}</h3>
          {viewModel.comparison.birthPrecision === 'date' ? <p className="birth-note">可能出生区间（起点包含，终点不包含）：<YunQiTimeDisplay value={candidate.from} variant="compact" showStandard={false} /> 至 <YunQiTimeDisplay value={candidate.until} variant="compact" /></p> : null}
          {readings.map((passage) => <Reading key={passage.id} value={passage} />)}
          {readings.length === 0 ? <p className="birth-note">此范围暂未收录已核对原文。</p> : null}
        </section>;
      })}
      <details className="birth-current-readings">
        <summary>对照时的当下原文</summary>
        <p className="birth-note">以下原文属于本次响应的当下快照，与出生原文分开阅读。</p>
        {viewModel.currentReadings.map((passage) => <Reading key={passage.id} value={passage} />)}
      </details>
      <ClassicsReadingNotice>{BIRTH_NOTICE}</ClassicsReadingNotice>
      </div>
    </section>
  );
}
