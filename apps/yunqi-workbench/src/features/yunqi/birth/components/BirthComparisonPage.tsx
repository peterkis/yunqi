import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { Link, useMatch, useNavigate } from 'react-router-dom';
import { Button } from '../../../../components/design/Button';
import { InlineText } from '../../../../components/design/InlineText';
import { BirthEntryForm } from './BirthEntryForm';
import { emptyBirthDraft, type BirthDraft, type BirthSlot, type BirthSubmission } from '../presentation/birth-entry';
import { QuoteBlock } from '../../../../components/design/QuoteBlock';
import { PanelSummary } from '../../../../components/layout/PanelSummary';
import { PanelView } from '../../../../components/layout/PanelView';
import { useSessionVisible } from '../../../../components/layout/SessionVisibility';
import { YunQiTimeDisplay } from '../../../../components/time/YunQiTimeDisplay';
import { YunQiTimeDetails } from '../../../../components/time/YunQiTimeDetails';
import { useBirthComparison } from '../hooks/useBirthComparison';
import { AnswerDestroyedNotice } from '../../../constitution/components/AnswerDestroyedNotice';
import type { BirthSessionComparison } from '../../presentation/map-learning';
import { BirthComparisonTable } from './BirthComparisonTable';
import { BIRTH_NOTICE, BirthClassicsView } from './BirthClassicsView';

export function BirthComparisonPage({ onAssess, onDiscardAssessment, ended }: {
  readonly onAssess: (comparison: BirthSessionComparison) => void;
  readonly onDiscardAssessment: () => void;
  readonly ended: number;
}) {
  const visible = useSessionVisible();
  const comparison = useBirthComparison();
  const { result, isPending: pending } = comparison;
  const reading = useMatch('/yunqi/birth/classics') !== null;
  const navigate = useNavigate();
  const readingLink = useRef<HTMLAnchorElement>(null);
  const wasReading = useRef(false);
  const assessmentButton = useRef<HTMLButtonElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const sheetOpener = useRef<HTMLButtonElement | null>(null);
  const [editor, setEditor] = useState<{ original: BirthDraft; focus: BirthSlot }>();
  const editing = editor !== undefined;
  const showForm = !result || editing;
  const wasShowingForm = useRef(showForm);
  const [draft, setDraft] = useState(emptyBirthDraft);
  const [submitted, setSubmitted] = useState<BirthSubmission>();
  const summary = submitted && ('year' in submitted ? `公历 ${submitted.year} 年 · 仅年份`
    : `${submitted.birthDate} · ${submitted.birthTime?.slice(0, 5) ?? '时刻不详'}`);
  const [cleared, setCleared] = useState(false);
  const submitting = useRef(false);
  const error = comparison.isError ? '无法完成对照，请核对出生日期、支持范围和网络后重试。' : undefined;
  function edit(next: BirthDraft) {
    if (comparison.isError) comparison.resetStatus();
    setDraft(next); setCleared(false);
  }
  function clearDraft() {
    edit({ ...emptyBirthDraft, mode: draft.mode, calendar: draft.calendar });
    setCleared(true);
  }
  function clearSession() {
    comparison.reset(); onDiscardAssessment(); setEditor(undefined); setSubmitted(undefined);
    clearDraft();
  }
  function openEditor(event: MouseEvent<HTMLButtonElement>, intent: 'modify' | 'complete') {
    if (!submitted) return;
    sheetOpener.current = event.currentTarget;
    const focus = intent === 'modify' ? 'primary' : draft.month ? 'day' : 'month';
    setEditor({ original: draft, focus });
    if (intent === 'modify') {
      const year = 'year' in submitted ? String(submitted.year) : submitted.birthDate.slice(0, 4);
      setDraft({ ...draft, mode: 'year', primary: year });
    }
    setCleared(false);
  }
  function cancelEdit() {
    if (!editor || pending) return;
    setDraft(editor.original); setEditor(undefined); setCleared(false); comparison.resetStatus();
  }
  useEffect(() => { if (!visible && editing && !pending) cancelEdit(); }, [visible, editing, pending]);
  useLayoutEffect(() => {
    if (wasShowingForm.current && !showForm && visible && !reading) {
      const target = sheetOpener.current?.isConnected ? sheetOpener.current : editButton.current;
      target?.focus({ preventScroll: true });
      sheetOpener.current = null;
    }
    wasShowingForm.current = showForm;
  }, [showForm, visible, reading]);
  function submit(request: BirthSubmission) {
    if (submitting.current) return;
    submitting.current = true;
    setCleared(false);
    const onSuccess = () => {
      sheetOpener.current = null;
      setSubmitted(request);
      onDiscardAssessment();
      setEditor(undefined);
    };
    const callbacks = { onSuccess, onSettled: () => { submitting.current = false; } };
    comparison.submit(request, callbacks);
  }
  useEffect(() => {
    if (wasReading.current && !reading && visible) readingLink.current?.focus({ preventScroll: true });
    wasReading.current = reading;
  }, [reading, visible]);
  useEffect(() => { if (ended) assessmentButton.current?.focus(); }, [ended]);
  return (
    <div className={reading ? 'birth-page birth-page--reading' : result ? 'birth-page' : 'birth-page birth-page--entry'}>
      {result && <PanelSummary viewModel={result.summary} />}
      {!reading && result && <PanelView actions={<div className="birth-actions" inert={editing || undefined} aria-hidden={editing || undefined}>
        <Button ref={assessmentButton} disabled={editing} variant={editing ? 'secondary' : 'primary'} onClick={() => onAssess(result.comparison)}>同时测评体质</Button>
      </div>} />}
      {showForm && visible && !reading && <BirthEntryForm variant={editing ? 'sheet' : 'inline'} initialFocus={editor?.focus} draft={draft} onEdit={edit}
        onClear={clearDraft} cleared={cleared} onConfirm={submit} pending={pending} error={error}
        onReturn={editing ? cancelEdit : undefined} />}
      <div className="birth-view" hidden={reading || !result} inert={editing || undefined} aria-hidden={editing || undefined}>
        <h2 className="visually-hidden">出生运气对照</h2>
        <div className="birth-input-region">
          {result && <div className="birth-input-summary" role="group" aria-label="出生资料摘要">
            <span className="num"><InlineText>{summary + ' · '}</InlineText></span>
            <Button ref={editButton} variant="text" onClick={event => openEditor(event, 'modify')}>修改</Button>
            <Button variant="text" onClick={clearSession}>清空本次资料</Button>
          </div>}
        </div>
        {pending ? <p role="status" className="birth-note">正在计算出生与当前运气</p> : null}
        {result ? (
          <section aria-label="出生与当前运气对照结果" className="birth-results">
            <p className={result.candidateMeta ? 'birth-candidate-meta birth-note' : 'birth-api-message'}><InlineText>{result.candidateMeta ?? result.comparison.message}</InlineText></p>
            <div className="birth-tables">
                {result.candidates.map((candidate, index) => (
                  <article key={`${candidate.from.localTime}-${index}`} className="birth-candidate-card birth-card" aria-label={candidate.label}>
                    {result.comparison.ambiguous || result.comparison.birthPrecision === 'year' ? <h3 className="birth-label">{candidate.label}</h3> : null}
                    {!result.candidateMeta && (result.comparison.birthPrecision !== 'time' ? (
                      <p className="birth-candidate-interval birth-note">
                        <span>可能出生区间（起点包含，终点不包含）：</span>
                        <span className="birth-interval-range num">
                          <span>{result.comparison.birthPrecision === 'year' ? candidate.from.localTime.slice(0, 16).replace('T', ' ') : <YunQiTimeDisplay value={candidate.from} variant="compact" />}</span>
                          {' '}<span>至 {result.comparison.birthPrecision === 'year' ? candidate.until.localTime.slice(0, 16).replace('T', ' ') : <YunQiTimeDisplay value={candidate.until} variant="compact" />}</span>
                        </span>
                      </p>
                    ) : <p className="birth-candidate-time birth-note">出生时刻：<YunQiTimeDisplay value={candidate.birthTime!} variant="compact" /></p>)}
                    <BirthComparisonTable candidate={candidate} current={result} />
                  </article>
                ))}
            </div>
            {result.comparison.birthPrecision === 'year' && <Button variant="secondary" data-birth-complete="" onClick={event => openEditor(event, 'complete')}>补全生日后查看所处气与所处运</Button>}
            <section className="birth-excerpts" aria-label="先天原文线索">
              <header className="birth-excerpts__header"><h3 className="birth-label">先天原文线索</h3><Link ref={readingLink} to="/yunqi/birth/classics">全部原文<svg className="birth-link-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg></Link></header>
              {result.candidates.map((candidate, index) => <div className="birth-excerpts__candidate" key={`${candidate.from.localTime}-${index}`}>
                {result.comparison.ambiguous ? <h4 className="birth-label">{candidate.label}</h4> : null}
                {candidate.excerpts.map((passage) => <div className="birth-excerpt reading-excerpt jade-card" data-element={passage.element} key={passage.id}>
                  <QuoteBlock compact label={passage.label} quote={passage.excerpt} source={passage.source} />
                </div>)}
                {candidate.excerpts.length === 0 ? <p className="birth-note">此范围暂未收录已核对原文。</p> : null}
              </div>)}
              <p className="birth-notice">{BIRTH_NOTICE}</p>
            </section>
            {ended > 0 && <AnswerDestroyedNotice key={ended} />}
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
        ) : null}
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
