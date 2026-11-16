import { useState, type FormEvent } from 'react';
import { YunQiTimeDisplay } from '../../../../components/time/YunQiTimeDisplay';
import { ClassicalPassages, LearningSnapshot, RelationHint } from '../../components/LearningPanels';
import { useBirthComparisonMutation } from '../../hooks/useLearningQueries';
import { mapBirthComparison } from '../../presentation/map-learning';
import { BirthAssessmentSession } from './BirthAssessmentSession';

export function BirthComparisonPage() {
  const mutation = useBirthComparisonMutation();
  const result = mutation.isSuccess && mutation.data ? mapBirthComparison(mutation.data) : undefined;
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [knowsTime, setKnowsTime] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [wasEdited, setWasEdited] = useState(false);
  const [comparisonRevision, setComparisonRevision] = useState(0);

  function edited() {
    setWasEdited(mutation.data !== undefined || wasEdited);
    setInputError(null);
    mutation.reset();
  }

  function invalid() {
    mutation.reset();
    setInputError('请填写有效的出生日期；已选择知道时刻时，还需填写出生时刻。');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const request = knowsTime
      ? { birthDate, birthTime: birthTime.length === 5 ? `${birthTime}:00` : birthTime }
      : { birthDate };
    setInputError(null);
    setWasEdited(false);
    // A fast response can batch away the pending render; an explicit new
    // comparison must still discard the previous local questionnaire.
    setComparisonRevision((revision) => revision + 1);
    mutation.mutate(request);
  }

  function clear() {
    mutation.reset();
    setBirthDate('');
    setBirthTime('');
    setKnowsTime(false);
    setInputError(null);
    setWasEdited(false);
  }

  return (
    <div className="birth-page learning-page">
      <header className="learning-page__hero">
        <p className="section-label">先天与当下</p>
        <h2>出生运气对照</h2>
        <p>并列查看出生时的运气背景与当前时气，辅助学习传统理论中的对应关系。</p>
      </header>
      <form className="learning-form birth-form" onSubmit={submit} aria-label="出生运气输入">
        <fieldset disabled={mutation.isPending}>
          <legend>出生资料</legend>
          <div className="birth-form__fields">
            <label>
              出生日期（公历）
              <input type="date" value={birthDate} required min="1900-01-01" max="2100-12-31" onInvalid={invalid} onChange={(event) => { setBirthDate(event.target.value); edited(); }} aria-describedby="birth-input-note" />
            </label>
            <label className="checkbox-field">
              <input type="checkbox" checked={knowsTime} onChange={(event) => { setKnowsTime(event.target.checked); edited(); }} />
              知道出生时刻
            </label>
            {knowsTime ? (
              <label>
                出生时刻（北京时间）
                <input type="time" step="1" value={birthTime} required onInvalid={invalid} onChange={(event) => { setBirthTime(event.target.value); edited(); }} />
              </label>
            ) : null}
          </div>
          <p id="birth-input-note" className="form-note">按北京时间 UTC+08 计算。不详时不默认填入某个时刻；若当天跨交节或交运，会分别展示可能结果。</p>
          <div className="learning-actions">
            <button className="primary-button" type="submit">{mutation.isPending ? '正在对照…' : '查看出生与当前运气'}</button>
            <button className="secondary-button" type="button" onClick={clear}>清空本次资料</button>
          </div>
        </fieldset>
      </form>
      {inputError ? <p role="alert" className="form-error">{inputError}</p> : null}
      {mutation.isError ? <p role="alert" className="form-error">无法完成对照，请核对出生日期、支持范围和网络后重试。</p> : null}
      {wasEdited ? <p role="status" className="form-note">资料已修改，请重新对照；原结果已隐藏。</p> : null}
      {mutation.isPending ? <p role="status">正在计算出生与当前运气</p> : null}
      {result ? (
        <section aria-label="出生与当前运气对照结果" className="birth-result">
          <p className={result.ambiguous ? 'boundary-message' : 'form-note'}>{result.message}</p>
          <div className="birth-comparison-grid">
            <div className="birth-candidates">
              {result.candidates.map((candidate, index) => (
                <article key={`${candidate.from.localTime}-${index}`} className="birth-candidate">
                  <LearningSnapshot learning={candidate.learning} title={candidate.label} showTime={result.birthPrecision === 'time'} />
                  {result.birthPrecision === 'date' ? (
                    <p className="birth-candidate__interval">
                      可能出生区间（起点包含，终点不包含）：
                      <YunQiTimeDisplay value={candidate.from} showStandard={false} />
                      <span> 至 </span>
                      <YunQiTimeDisplay value={candidate.until} />
                    </p>
                  ) : null}
                  <details className="workbench-disclosure birth-relations">
                    <summary>查看与当前的五行关系</summary>
                    <div className="birth-relation-list">
                      {candidate.comparisons.map((relation, position) => <RelationHint key={position} relation={relation} />)}
                    </div>
                  </details>
                  <ClassicalPassages title="出生年度 · 经典原文" passages={candidate.learning.annualPassages} />
                  <ClassicalPassages title="出生阶段 · 经典原文" passages={candidate.learning.currentPassages} />
                </article>
              ))}
            </div>
            <aside className="birth-current" aria-label="对照时的当前运气">
              <LearningSnapshot learning={result.current} title="当前运气" />
              <ClassicalPassages title="当前年度 · 经典原文" passages={result.current.annualPassages} />
              <ClassicalPassages title="当前阶段 · 经典原文" passages={result.current.currentPassages} />
            </aside>
          </div>
          <BirthAssessmentSession key={comparisonRevision} comparison={result} />
          <p className="learning-boundary">出生运气是传统理论中的时间背景，不能替代体质量表与四诊，也不能确定个人易患何种疾病。</p>
        </section>
      ) : (
        <p className="learning-empty">填写出生日期后，即可左右对照。资料仅用于本次页面计算，离开页面后清空。</p>
      )}
    </div>
  );
}
