import { useId, useState } from 'react';
import { Button } from '../../../components/design/Button';
import { InfoCard } from '../../../components/design/InfoCard';
import { QuoteBlock } from '../../../components/design/QuoteBlock';
import { PanelSummary } from '../../../components/layout/PanelSummary';
import { mapPanelSummary } from '../presentation/panel-summary';
import type { LearningViewModel } from '../presentation/map-learning';

export function CurrentClassicsPage({ learning }: { readonly learning: LearningViewModel }) {
  const [scope, setScope] = useState<'annual' | 'current'>('current');
  const readingId = useId();
  const passages = scope === 'annual' ? learning.annualPassages : learning.currentPassages;
  const facts = learning.facts;
  return <div className="current-classics">
    <PanelSummary viewModel={mapPanelSummary(facts.summary, { step: facts.currentStep, relation: learning.currentQi })} />
    <div className="current-classics__segments" role="group" aria-label="原文范围">
      <Button variant="text" aria-pressed={scope === 'annual'} aria-controls={readingId} onClick={() => setScope('annual')}>全年</Button>
      <Button variant="text" aria-pressed={scope === 'current'} aria-controls={readingId} onClick={() => setScope('current')}>当下阶段</Button>
    </div>
    <div className="current-classics__readings" id={readingId} role="region" aria-label={scope === 'annual' ? '全年原文' : '当下阶段原文'} tabIndex={0}>
      {passages.map((passage) => <InfoCard key={passage.id} label={`${passage.scopeLabel} · ${passage.section}`} meta={scope === 'current' ? '正在此段' : undefined}>
        <QuoteBlock quote={passage.previewQuote} fullQuote={passage.fullQuote} interpretation={passage.explanation} source={passage.source} />
        <a className="current-classics__source" href={passage.sourceUrl} target="_blank" rel="noreferrer">查看原文出处<span className="visually-hidden">：{passage.section}（新窗口）</span></a>
      </InfoCard>)}
      {passages.length === 0 ? <p className="current-copy">此范围暂未收录已核对原文。</p> : null}
    </div>
    <p className="current-classics__notice current-meta">文献线索，非个体发病预测</p>
  </div>;
}
