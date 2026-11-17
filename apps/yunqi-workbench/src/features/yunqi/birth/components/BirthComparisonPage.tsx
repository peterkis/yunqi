import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useMatch, useNavigate } from 'react-router-dom';
import { Button } from '../../../../components/design/Button';
import { QuoteBlock } from '../../../../components/design/QuoteBlock';
import { PanelSummary } from '../../../../components/layout/PanelSummary';
import { YunQiTimeDisplay } from '../../../../components/time/YunQiTimeDisplay';
import { YunQiTimeDetails } from '../../../../components/time/YunQiTimeDetails';
import { useBirthComparison } from '../hooks/useBirthComparison';
import { BirthAssessmentSession } from './BirthAssessmentSession';
import { BirthComparisonTable } from './BirthComparisonTable';
import { BIRTH_NOTICE, BirthClassicsView } from './BirthClassicsView';

export function BirthComparisonPage() {
  const mutation = useBirthComparison();
  const { result } = mutation;
  const reading = useMatch('/yunqi/birth/classics') !== null;
  const navigate = useNavigate();
  const readingLink = useRef<HTMLAnchorElement>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  const wasReading = useRef(false);
  // A ref also blocks a second submit in the same event turn before pending renders.
  const submitting = useRef(false);
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [knowsTime, setKnowsTime] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [wasEdited, setWasEdited] = useState(false);
  const [comparisonRevision, setComparisonRevision] = useState(0);
  const [formExpanded, setFormExpanded] = useState(false);
  const collapsed = result !== undefined && !formExpanded;

  useEffect(() => {
    if (formExpanded) dateInput.current?.focus();
  }, [formExpanded]);

  useEffect(() => {
    if (wasReading.current && !reading) readingLink.current?.focus();
    wasReading.current = reading;
  }, [reading]);

  function edited() {
    setWasEdited(result !== undefined || wasEdited);
    setInputError(null);
    mutation.reset();
  }

  function invalid() {
    mutation.reset();
    setInputError('请填写有效的出生日期；已选择知道时刻时，还需填写出生时刻。');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending || submitting.current) return;
    submitting.current = true;
    const request = knowsTime
      ? { birthDate, birthTime: birthTime.length === 5 ? `${birthTime}:00` : birthTime }
      : { birthDate };
    setInputError(null);
    setWasEdited(false);
    setFormExpanded(false);
    // A fast response can batch away the pending render; an explicit new
    // comparison must still discard the previous local questionnaire.
    setComparisonRevision((revision) => revision + 1);
    mutation.submit(request, { onSettled: () => { submitting.current = false; } });
  }

  function clear() {
    mutation.reset();
    setBirthDate('');
    setBirthTime('');
    setKnowsTime(false);
    setInputError(null);
    setWasEdited(false);
    setFormExpanded(true);
    submitting.current = false;
  }

  return (
    <div className={reading ? 'birth-page birth-page--reading' : 'birth-page'}>
      {result ? <PanelSummary viewModel={result.summary} /> : null}
      <div className="birth-view" hidden={reading}>
        <h2 className="visually-hidden">出生运气对照</h2>
        {collapsed ? <div className="birth-input-summary" role="group" aria-label="出生资料摘要">
          <span>{birthDate} · {knowsTime ? birthTime.slice(0, 5) : '时刻不详'} · </span>
          <Button variant="text" onClick={() => setFormExpanded(true)}>修改</Button>
          <Button variant="text" onClick={clear}>清空本次资料</Button>
        </div> : <form className="birth-input" onSubmit={submit} aria-label="出生运气输入" aria-busy={mutation.isPending}>
          <fieldset disabled={mutation.isPending}>
            <legend className="visually-hidden">出生资料</legend>
            <div className="birth-input__fields">
              <label>
                出生日期（公历）
                <input ref={dateInput} type="date" value={birthDate} required min="1900-01-01" max="2100-12-31" onInvalid={invalid} onChange={(event) => { setBirthDate(event.target.value); edited(); }} aria-describedby="birth-input-note" />
              </label>
              <label className="birth-input__known-time">
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
            <p id="birth-input-note" className="birth-note">手动填写，按北京时间 UTC+08 展示；时刻不详时保留当天所有可能归属。</p>
            <div className="birth-input__actions">
              <Button type="submit">{mutation.isPending ? '正在对照…' : '查看出生与当前运气'}</Button>
              <Button variant="text" onClick={clear}>清空本次资料</Button>
            </div>
          </fieldset>
        </form>}
        {inputError ? <p role="alert" className="birth-notice">{inputError}</p> : null}
        {mutation.isError ? <p role="alert" className="birth-notice">无法完成对照，请核对出生日期、支持范围和网络后重试。</p> : null}
        {wasEdited ? <p role="status" className="birth-note">资料已修改，请重新对照；原结果已隐藏。</p> : null}
        {mutation.isPending ? <p role="status" className="birth-note">正在计算出生与当前运气</p> : null}
        {result ? (
          <section aria-label="出生与当前运气对照结果" className="birth-results">
            <p className={result.candidateMeta ? 'birth-candidate-meta birth-note' : 'birth-api-message'}>{result.candidateMeta ?? result.comparison.message}</p>
            <div className="birth-tables">
                {result.candidates.map((candidate, index) => (
                  <article key={`${candidate.from.localTime}-${index}`} className="birth-candidate-card birth-card" aria-label={candidate.label}>
                    {result.comparison.ambiguous ? <h3 className="birth-label">{candidate.label}</h3> : null}
                    {!result.candidateMeta && (result.comparison.birthPrecision === 'date' ? (
                      <p className="birth-candidate-interval birth-note">
                        可能出生区间（起点包含，终点不包含）：
                        <YunQiTimeDisplay value={candidate.from} variant="compact" showStandard={false} />
                        <span> 至 </span>
                        <YunQiTimeDisplay value={candidate.until} variant="compact" />
                      </p>
                    ) : <p className="birth-candidate-time birth-note">出生时刻：<YunQiTimeDisplay value={candidate.birthTime} variant="compact" /></p>)}
                    <BirthComparisonTable candidate={candidate} current={result} />
                  </article>
                ))}
            </div>
            <section className="birth-card birth-excerpts" aria-label="先天原文线索">
              <header className="birth-excerpts__header"><h3 className="birth-label">先天原文线索</h3><Link ref={readingLink} to="/yunqi/birth/classics">全部原文<svg className="birth-link-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg></Link></header>
              {result.candidates.map((candidate, index) => <div className="birth-excerpts__candidate" key={`${candidate.from.localTime}-${index}`}>
                {result.comparison.ambiguous ? <h4 className="birth-label">{candidate.label}</h4> : null}
                {candidate.excerpts.map((passage) => <QuoteBlock key={passage.id} compact quote={passage.excerpt} source={passage.source} />)}
                {candidate.excerpts.length === 0 ? <p className="birth-note">此范围暂未收录已核对原文。</p> : null}
              </div>)}
              <p className="birth-notice">{BIRTH_NOTICE}</p>
            </section>
            <BirthAssessmentSession key={comparisonRevision} comparison={result.comparison} />
            <details className="birth-technical">
              <summary>计算说明与版本</summary>
              <h3 className="birth-label">当下快照</h3>
              <YunQiTimeDetails entries={result.calculationTimes} />
              {result.candidates.map((candidate) => <section key={candidate.label} aria-label={`${candidate.label}精确时刻`}>
                <h3 className="birth-label">{candidate.label}</h3>
                <YunQiTimeDetails entries={candidate.calculationTimes} />
              </section>)}
              <p className="birth-note">{result.comparison.current.facts.contractId} · {result.comparison.current.facts.ruleVersion} · {result.comparison.current.ruleVersion}</p>
              {result.comparison.current.notes.map((note) => <p className="birth-note" key={note}>{note}</p>)}
            </details>
          </section>
        ) : (
          <p className="birth-note">填写出生日期并提交后，即可并列对照。资料仅保存在本页内存，离开页面后清空。</p>
        )}
      </div>
      {reading && (result ? <BirthClassicsView viewModel={result} /> : (
        <section className="birth-classics" aria-label="先天原文与释义">
          <p className="birth-note">本页尚无出生对照，请先填写出生资料。</p>
          <Button variant="secondary" onClick={() => navigate('/yunqi/birth')}>返回出生输入</Button>
        </section>
      ))}
    </div>
  );
}
