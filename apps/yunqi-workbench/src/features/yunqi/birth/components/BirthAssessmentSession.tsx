import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../../../../components/design/Button';
import { YunQiTimeDisplay } from '../../../../components/time/YunQiTimeDisplay';
import { ConstitutionAssessmentPanel } from '../../../constitution/components/ConstitutionAssessmentPanel';
import type { BirthComparisonViewModel, LearningViewModel } from '../../presentation/map-learning';

function ContextFacts({ learning }: { readonly learning: LearningViewModel }) {
  const { facts, currentMovement } = learning;
  return (
    <dl className="birth-assessment-facts">
      <div><dt>岁运</dt><dd>{facts.summary.year} · {facts.summary.stemBranch.ganzhi} · {facts.summary.suiYun.element}运{facts.summary.suiYun.state}</dd></div>
      <div><dt>司天</dt><dd>{facts.summary.sitian}</dd></div>
      <div><dt>在泉</dt><dd>{facts.summary.zaiquan}</dd></div>
      <div><dt>{currentMovement.name}</dt><dd><span>主运 {currentMovement.hostLabel}</span><span>客运 {currentMovement.guestLabel}</span></dd></div>
      <div><dt>{facts.currentStep.name}</dt><dd><span>主气 {facts.currentStep.hostQi}</span><span>客气 {facts.currentStep.guestQi}</span></dd></div>
    </dl>
  );
}

export function BirthAssessmentSession({ comparison }: { readonly comparison: BirthComparisonViewModel }) {
  const [active, setActive] = useState(false);
  const panelId = useId();
  const actionRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (active) headingRef.current?.focus();
  }, [active]);

  function toggleAssessment() {
    setActive((current) => !current);
    if (active) actionRef.current?.focus();
  }

  return (
    <section className="birth-session" aria-label="本次对照体质测评">
      <header className="birth-session-header">
        <Button variant={active ? 'secondary' : 'primary'} ref={actionRef} aria-expanded={active} aria-controls={active ? panelId : undefined} onClick={toggleAssessment}>
          {active ? '结束本次测评' : '同时测评体质'}
        </Button>
      </header>
      <p className="birth-note">问卷按需打开。结束测评、修改出生资料、清空或重新对照，都会清除本次作答和测评结果。</p>
      {active ? (
        <div className="birth-assessment-layout" id={panelId}>
          <aside className="birth-assessment-context" aria-label="本次测评对照背景">
            <header>
              <h4>本次对照快照</h4>
              <YunQiTimeDisplay value={comparison.current.facts.inputTime} />
              <p className="form-note">以下当前背景以这次查询为准，测评期间保持一致。</p>
            </header>
            <section className="birth-assessment-context-card" aria-label="测评中的当前背景">
              <h4>当前背景</h4>
              <ContextFacts learning={comparison.current} />
            </section>
            <div className="birth-assessment-birth-context">
              <h4>出生背景</h4>
              {comparison.ambiguous ? <p className="form-note">出生时刻不详，下列候选均保留；它们共用本次量表，不选择其中一个推断体质。</p> : null}
              {comparison.candidates.map((candidate, index) => (
                <section className="birth-assessment-context-card" key={`${candidate.from.localTime}-${index}`} aria-label={`测评中的${candidate.label}`}>
                  <h5>{candidate.label}</h5>
                  <ContextFacts learning={candidate.learning} />
                  <p className="birth-assessment-interval">
                    {comparison.birthPrecision === 'time' ? '出生时刻：' : '可能区间（起点含、终点不含）：'}
                    <YunQiTimeDisplay value={candidate.from} showStandard={false} />
                    {comparison.birthPrecision === 'date' ? <><span> 至 </span><YunQiTimeDisplay value={candidate.until} showStandard={false} /></> : null}
                  </p>
                </section>
              ))}
            </div>
            <p className="form-note">五步运为待确认的教学口径。量表独立计分，不以出生或当前运气调整分数。</p>
          </aside>
          <div className="birth-assessment-questionnaire">
            <h3 className="birth-assessment-heading" tabIndex={-1} ref={headingRef}>本次体质测评</h3>
            <ConstitutionAssessmentPanel />
          </div>
        </div>
      ) : null}
    </section>
  );
}
