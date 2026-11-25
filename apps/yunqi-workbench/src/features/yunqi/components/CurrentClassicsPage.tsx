import { useId, useState } from 'react';
import { Button } from '../../../components/design/Button';
import { useSegmentIndicator } from '../../../components/design/useSegmentIndicator';
import { PanelSummary } from '../../../components/layout/PanelSummary';
import { mapClassicsCard } from '../presentation/map-classics';
import { mapPanelSummary } from '../presentation/panel-summary';
import type { LearningViewModel } from '../presentation/map-learning';
import { ClassicsReadingCard, ClassicsReadingNotice } from './ClassicsReadingCard';

export function CurrentClassicsPage({ learning }: { readonly learning: LearningViewModel }) {
  const [scope, setScope] = useState<'annual' | 'current'>('current');
  const trackRef = useSegmentIndicator(scope);
  const readingId = useId();
  const passages = scope === 'annual' ? learning.annualPassages : learning.currentPassages;
  const facts = learning.facts;
  return <div className="current-classics">
    <PanelSummary viewModel={mapPanelSummary(facts.summary, { step: facts.currentStep, relation: learning.currentQi })} />
    <div ref={trackRef} className="current-classics__segments motion-segments" role="group" aria-label="原文范围">
      <span className="motion-segment-indicator" aria-hidden="true" />
      <Button variant="text" aria-pressed={scope === 'annual'} aria-controls={readingId} onClick={() => setScope('annual')}>全年</Button>
      <Button variant="text" aria-pressed={scope === 'current'} aria-controls={readingId} onClick={() => setScope('current')}>当下阶段</Button>
    </div>
    <div className="current-classics__readings" data-panel-scroll="" id={readingId} role="region" aria-label={scope === 'annual' ? '全年原文' : '当下阶段原文'} tabIndex={0}>
      {passages.map((passage) => <ClassicsReadingCard key={passage.id} reading={mapClassicsCard(passage, scope === 'current')} />)}
      {passages.length === 0 ? <p className="current-copy">此范围暂未收录已核对原文。</p> : null}
      <ClassicsReadingNotice />
    </div>
  </div>;
}
