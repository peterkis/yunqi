import type { ReactNode } from 'react';
import { InfoCard } from '../../../components/design/InfoCard';
import { YunQiTimeDisplay } from '../../../components/time/YunQiTimeDisplay';
import { currentRuleNotes } from '../presentation/current-rule-notes';
import type { LearningViewModel } from '../presentation/map-learning';
import { CurrentElementValue } from './CurrentYunQiParts';
import './CurrentRuleExplanation.css';

function MappingRow({ step, source, children }: { readonly step: string; readonly source: ReactNode; readonly children: ReactNode }) {
  return <li>
    <span className="rule-explanation__number" aria-hidden="true">{step}</span>
    <span className="rule-explanation__source">{source}</span>
    <span className="rule-explanation__arrow" aria-hidden="true">→</span>
    <span className="rule-explanation__values">{children}</span>
  </li>;
}

export function CurrentRuleExplanation({ learning }: { readonly learning: LearningViewModel }) {
  const { summary, annualElements, timeline } = learning.facts;
  const { stemBranch, suiYun, interval } = summary;
  const notes = currentRuleNotes(learning);
  return <InfoCard className="rule-explanation" label="规则推演说明"
    meta={<span className="rule-explanation__scope" title={notes.scopeNote || undefined}>教学口径</span>}>
    <p className="rule-explanation__intro">按本次计算结果逐条核对 · 辅助参考，不作诊断依据</p>
    <div className="rule-explanation__boundary">
      <div className="rule-explanation__boundary-heading">
        <h4>年界与区间</h4><small>左闭右开</small>
      </div>
      <dl>
        <div><dt>年界起点</dt><dd>{summary.year} 年大寒实际交节时刻</dd></div>
        <div><dt>实际区间</dt><dd className="rule-explanation__interval">
          <span className="rule-explanation__endpoint rule-explanation__endpoint--start">起</span>
          <YunQiTimeDisplay value={interval.start} />
          <span className="rule-explanation__connector" aria-hidden="true">↓</span>
          <span className="rule-explanation__endpoint rule-explanation__endpoint--end">止</span>
          <YunQiTimeDisplay value={interval.end} />
        </dd></div>
      </dl>
    </div>
    <div className="rule-explanation__mapping">
      <h4>干支与气运映射</h4>
      <ol>
        <MappingRow step="01" source={<>年干 <b>{stemBranch.stem}</b></>}>
          <CurrentElementValue element={annualElements.suiYun} label={`${suiYun.element}运${suiYun.state}（${suiYun.tone}）`} />
        </MappingRow>
        <MappingRow step="02" source={<>年支 <b>{stemBranch.branch}</b></>}>
          <span>司天 <CurrentElementValue element={annualElements.sitian} label={summary.sitian} /></span>
          <span>在泉 <CurrentElementValue element={annualElements.zaiquan} label={summary.zaiquan} /></span>
        </MappingRow>
        <MappingRow step="03" source={`${timeline[2].name}客气`}>
          <span>{timeline[2].guestQi === summary.sitian && '同司天 '}<CurrentElementValue element={timeline[2].guestElement} label={timeline[2].guestQi} /></span>
        </MappingRow>
        <MappingRow step="04" source={`${timeline[5].name}客气`}>
          <span>{timeline[5].guestQi === summary.zaiquan && '同在泉 '}<CurrentElementValue element={timeline[5].guestElement} label={timeline[5].guestQi} /></span>
        </MappingRow>
      </ol>
    </div>
    <div className="rule-explanation__notes">
      <h4>口径与数据版本</h4>
      <p><strong>五步运偏移口径</strong>{notes.movementNote || learning.currentMovement.boundaryMethod}</p>
      {notes.readingNote && <p><strong>经典摘录说明</strong>{notes.readingNote}</p>}
      {notes.extra.map((text, index) => <p key={index}>{text}</p>)}
      <div className="rule-explanation__versions">{notes.versions.map(version =>
        <span key={version.id} title={version.id}>{version.name} <b>{version.label}</b></span>)}</div>
    </div>
  </InfoCard>;
}
