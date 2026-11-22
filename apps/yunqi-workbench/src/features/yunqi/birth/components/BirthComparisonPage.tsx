import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useMatch, useNavigate } from 'react-router-dom';
import { Button } from '../../../../components/design/Button';
import { InlineText } from '../../../../components/design/InlineText';
import { DateField } from '../../../../components/design/DateField';
import { SegmentedControl } from '../../../../components/design/SegmentedControl';
import { QuoteBlock } from '../../../../components/design/QuoteBlock';
import { PanelSummary } from '../../../../components/layout/PanelSummary';
import { PanelView } from '../../../../components/layout/PanelView';
import { useSessionVisible } from '../../../../components/layout/SessionVisibility';
import { useMotionLevel } from '../../../../providers/MotionProvider';
import { animateMotion, motionMilliseconds } from '../../../../lib/motion';
import { YunQiTimeDisplay } from '../../../../components/time/YunQiTimeDisplay';
import { YunQiTimeDetails } from '../../../../components/time/YunQiTimeDetails';
import { useBirthComparison } from '../hooks/useBirthComparison';
import { BirthAssessmentSession } from './BirthAssessmentSession';
import { BirthComparisonTable } from './BirthComparisonTable';
import { BIRTH_NOTICE, BirthClassicsView } from './BirthClassicsView';

export function BirthComparisonPage() {
  const visible = useSessionVisible();
  const level = useMotionLevel();
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
  const [dateRevision, setDateRevision] = useState(0);
  const [birthTime, setBirthTime] = useState('');
  const [knowsTime, setKnowsTime] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [wasEdited, setWasEdited] = useState(false);
  const [comparisonRevision, setComparisonRevision] = useState(0);
  const [formExpanded, setFormExpanded] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);
  const clearingRef = useRef(false);
  const inputRegion = useRef<HTMLDivElement>(null);
  const birthView = useRef<HTMLDivElement>(null);
  const previousInputSize = useRef<{ collapsed: boolean; height: number } | undefined>(undefined);
  const collapsed = result !== undefined && !formExpanded;
  const formId = useId();

  useEffect(() => {
    if (formExpanded && visible && !reading) dateInput.current?.focus();
  }, [formExpanded, dateRevision]);

  useLayoutEffect(() => {
    const element = inputRegion.current!;
    if (!visible || reading) { previousInputSize.current = undefined; return; }
    const height = element.getBoundingClientRect().height;
    const previous = previousInputSize.current;
    previousInputSize.current = { collapsed, height };
    if (!previous || previous.collapsed === collapsed || level !== 'full') return;
    const animation = animateMotion(element, level, [{ height: `${previous.height}px` }, { height: `${height}px` }], '--motion-base', '--ease-standard');
    return () => animation?.cancel();
  }, [collapsed, knowsTime, level, visible, reading]);

  useLayoutEffect(() => {
    if (!clearing) return;
    // Hidden retained sessions finish the requested clear without moving focus.
    if (level === 'off' || !visible || reading) { clearNow(); return; }
    const animation = animateMotion(birthView.current, level, [{ opacity: 1 }, { opacity: 0 }], '--motion-fast', '--ease-exit', 'forwards');
    const timer = setTimeout(clearNow, motionMilliseconds(birthView.current!, '--motion-fast'));
    return () => { clearTimeout(timer); animation?.cancel(); };
  }, [clearing, level, visible, reading]);

  useEffect(() => {
    if (wasReading.current && !reading && visible) readingLink.current?.focus({ preventScroll: true });
    wasReading.current = reading;
  }, [reading]);

  function edited() {
    cancelClear();
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
    cancelClear();
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

  function cancelClear() {
    clearingRef.current = false;
    setClearing(false);
    setCleared(false);
  }

  function clear() {
    if (clearingRef.current) return;
    if (level === 'off') clearNow();
    else { clearingRef.current = true; setClearing(true); }
  }

  function clearNow() {
    mutation.reset();
    setBirthDate('');
    setDateRevision((value) => value + 1);
    setBirthTime('');
    setKnowsTime(false);
    setInputError(null);
    setWasEdited(false);
    setFormExpanded(true);
    submitting.current = false;
    clearingRef.current = false;
    setClearing(false);
    setCleared(true);
  }

  return (
    <div className={reading ? 'birth-page birth-page--reading' : 'birth-page'}>
      {result ? <PanelSummary viewModel={result.summary} /> : null}
      {!reading && !collapsed ? <PanelView actions={<div className="birth-actions">
        <Button type="submit" form={formId} disabled={mutation.isPending}>{mutation.isPending ? '正在对照…' : '查看对照'}</Button>
      </div>} /> : null}
      <div className="birth-view" ref={birthView} hidden={reading}>
        <h2 className="visually-hidden">出生运气对照</h2>
        <div className="birth-input-region" ref={inputRegion}>
        {collapsed ? <div className="birth-input-summary" role="group" aria-label="出生资料摘要">
          <span className="num"><InlineText>{`${birthDate} · ${knowsTime ? birthTime.slice(0, 5) : '时刻不详'} · `}</InlineText></span>
          <Button variant="text" onClick={() => setFormExpanded(true)}>修改</Button>
          <Button variant="text" onClick={clear}>清空本次资料</Button>
        </div> : <form id={formId} className="birth-input" onSubmit={submit} aria-label="出生运气输入" aria-busy={mutation.isPending}>
          <fieldset disabled={mutation.isPending}>
            <legend className="visually-hidden">出生资料</legend>
            <div className="birth-input__fields">
              <DateField key={dateRevision} ref={dateInput} label="出生日期（公历）" value={birthDate} required onInvalid={invalid}
                onChange={(value) => { setBirthDate(value); edited(); }} />
              <div className="birth-input__known-time">
                <SegmentedControl label="出生时刻是否已知" compact value={knowsTime ? 'known' : 'unknown'}
                  describedBy={knowsTime ? undefined : 'birth-input-note'}
                  segments={[{ value: 'unknown', label: '时刻不详' }, { value: 'known', label: '已知时刻' }]}
                  onChange={(value) => { setKnowsTime(value === 'known'); edited(); }} />
              </div>
              {knowsTime ? (
                <label>
                  出生时刻
                  <input className="num" type="time" step="1" value={birthTime} required onInvalid={invalid} onChange={(event) => { setBirthTime(event.target.value); edited(); }} />
                </label>
              ) : null}
            </div>
            {!knowsTime && <p id="birth-input-note" className="birth-note">保留当天所有可能归属</p>}
            <div className="birth-input__actions">
              <Button variant="text" onClick={clear}>清空本次资料</Button>
            </div>
          </fieldset>
        </form>}
        </div>
        {cleared ? <p role="status" className="visually-hidden">已清空本次资料</p> : null}
        {inputError ? <p role="alert" className="birth-notice">{inputError}</p> : null}
        {mutation.isError ? <p role="alert" className="birth-notice">无法完成对照，请核对出生日期、支持范围和网络后重试。</p> : null}
        {wasEdited ? <p role="status" className="birth-note">资料已修改，请重新对照；原结果已隐藏。</p> : null}
        {mutation.isPending ? <p role="status" className="birth-note">正在计算出生与当前运气</p> : null}
        {result ? (
          <section aria-label="出生与当前运气对照结果" className="birth-results">
            <p className={result.candidateMeta ? 'birth-candidate-meta birth-note' : 'birth-api-message'}><InlineText>{result.candidateMeta ?? result.comparison.message}</InlineText></p>
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
            <BirthAssessmentSession key={comparisonRevision} comparison={result.comparison} actionsEnabled={collapsed && !reading} />
            <details className="birth-technical">
              <summary>计算说明与版本</summary>
              <h3 className="birth-label">当下快照</h3>
              <YunQiTimeDetails entries={result.calculationTimes} />
              {result.candidates.map((candidate) => <section key={candidate.label} aria-label={`${candidate.label}精确时刻`}>
                <h3 className="birth-label">{candidate.label}</h3>
                <YunQiTimeDetails entries={candidate.calculationTimes} />
              </section>)}
              <p className="birth-note num"><InlineText>{`${result.comparison.current.facts.contractId} · ${result.comparison.current.facts.ruleVersion} · ${result.comparison.current.ruleVersion}`}</InlineText></p>
              {result.comparison.current.notes.map((note) => <p className="birth-note" key={note}>{note}</p>)}
            </details>
          </section>
        ) : (
          <p className="birth-note">填写出生日期并提交后，即可并列对照。资料仅保存在本次会话内存，清空后销毁。</p>
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
