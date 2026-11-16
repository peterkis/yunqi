import type { ClassicalPassageViewModel, LearningRelationViewModel, MovementViewModel, LearningViewModel } from '../presentation/map-learning';
import { YunQiTimeDisplay } from '../../../components/time/YunQiTimeDisplay';
import { DataLabel } from '../../../components/ui/DataLabel';
import { Panel } from '../../../components/ui/Panel';
import { YunQiTimeRange } from './YunQiTimeRange';



export function RelationHint({ relation }: { readonly relation: LearningRelationViewModel }) {
  return (
    <article className="relation-hint">
      <header>
        <h3>{relation.title}</h3>
        <span className="relation-hint__label">{relation.label}</span>
      </header>
      <p className="relation-hint__direction">{relation.relation}</p>
      <p>{relation.explanation}</p>
      <details className="inline-disclosure">
        <summary>关系依据</summary>
        <ul className="relation-sources">
          {relation.sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}（新窗口）</a></li>)}
        </ul>
      </details>
    </article>
  );
}

export function MovementCard({ movement }: { readonly movement: MovementViewModel }) {
  return (
    <Panel title={`当前五运 · ${movement.name}`} description="教学口径 · 待专家确认。五运与六气各有分段。">
      <div className="movement-pair">
        <DataLabel label="主运" value={movement.hostLabel} />
        <DataLabel label="客运" value={movement.guestLabel} />
      </div>
      <YunQiTimeRange start={movement.start} end={movement.end} />
      <details className="inline-disclosure">
        <summary>交运口径</summary>
        <p>{movement.boundaryMethod}</p>
        <p>{movement.explanation}</p>
      </details>
    </Panel>
  );
}

export function ClassicalPassages({ passages, title }: {
  readonly passages: readonly ClassicalPassageViewModel[];
  readonly title: string;
}) {
  return (
    <details className="workbench-disclosure classical-disclosure">
      <summary>
        <span>{title}</span>
        <span className="workbench-disclosure__hint">{passages.length} 则匹配原文 · 展开学习</span>
      </summary>
      <div className="classical-passages">
        {passages.map((passage) => (
          <article className="classical-passage" key={passage.id}>
            <p className="section-label">{passage.scopeLabel}</p>
            <h3>《{passage.work}》 · {passage.chapter}（摘录）</h3>
            <p className="classical-passage__section">{passage.section}</p>
            <blockquote>{passage.quote}</blockquote>
            <div className="classical-passage__explanation">
              <strong>阅读释义（非原文）</strong>
              <p>{passage.explanation}</p>
            </div>
            <a href={passage.sourceUrl} target="_blank" rel="noreferrer">查看原文出处<span className="visually-hidden">：{passage.section}（新窗口）</span></a>
          </article>
        ))}
        {passages.length === 0 ? <p>此范围暂未收录已核对原文。</p> : null}
      </div>
    </details>
  );
}

export function LearningSnapshot({ learning, title, showTime = true }: {
  readonly learning: LearningViewModel;
  readonly title: string;
  readonly showTime?: boolean;
}) {
  const facts = learning.facts;
  return (
    <Panel title={title}>
      {showTime ? <YunQiTimeDisplay value={facts.inputTime} /> : null}
      <p className="snapshot-year">{facts.summary.year} · {facts.summary.stemBranch.ganzhi}</p>
      <dl className="snapshot-facts">
        <div><dt>岁运</dt><dd>{facts.summary.suiYun.element}运{facts.summary.suiYun.state}</dd></div>
        <div><dt>司天</dt><dd>{facts.summary.sitian}</dd></div>
        <div><dt>在泉</dt><dd>{facts.summary.zaiquan}</dd></div>
        <div><dt>{learning.currentMovement.name} · 主运</dt><dd>{learning.currentMovement.hostLabel}</dd></div>
        <div><dt>{learning.currentMovement.name} · 客运</dt><dd>{learning.currentMovement.guestLabel}</dd></div>
        <div><dt>{facts.currentStep.name} · 主气</dt><dd>{facts.currentStep.hostQi}</dd></div>
        <div><dt>{facts.currentStep.name} · 客气</dt><dd>{facts.currentStep.guestQi}</dd></div>
      </dl>
      <div className="snapshot-relations">
        <span>司天与中运 · {learning.annualRelation.label}</span>
        <span>当步主客气 · {learning.currentQi.label}</span>
      </div>
      <p className="form-note">五步运按教学口径分段，待专家确认。</p>
    </Panel>
  );
}
