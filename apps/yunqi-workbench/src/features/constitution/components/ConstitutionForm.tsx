import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '../../../components/design/Button';
import { InlineText } from '../../../components/design/InlineText';
import { ScaleOption } from '../../../components/design/ScaleOption';
import { SegmentedControl } from '../../../components/design/SegmentedControl';
import { PanelView } from '../../../components/layout/PanelView';
import { useSessionVisible } from '../../../components/layout/SessionVisibility';
import { useMotionLevel } from '../../../providers/MotionProvider';
import type { ConstitutionContextViewModel, ConstitutionQuestionnaireViewModel, QuestionnaireSex } from '../presentation/map-constitution';
import { mapQuestionnaireProgress } from '../presentation/map-constitution';
import { useConstitutionAssessment } from '../hooks/useConstitution';
import { ConstitutionResults } from './ConstitutionResults';
import { ConstitutionContext, ConstitutionContextDetails } from './ConstitutionContext';
import { ConstitutionDimension } from './ConstitutionDimension';
import { AnswerDestroyedNotice } from './AnswerDestroyedNotice';
import { fadeDestroyedAnswer } from './destroy-answer-visual';

export const ANSWER_HOLD_MS = 240;

export interface ConstitutionFormProps {
  readonly questionnaire: ConstitutionQuestionnaireViewModel;
  readonly context?: ConstitutionContextViewModel;
  readonly onEnd?: () => void;
  readonly actionsEnabled?: boolean;
}

export function ConstitutionForm({ questionnaire, context, onEnd, actionsEnabled = true }: ConstitutionFormProps) {
  const mutation = useConstitutionAssessment();
  const visible = useSessionVisible();
  const level = useMotionLevel();
  const [sex, setSex] = useState<QuestionnaireSex | ''>('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirmingSexChange, setConfirmingSexChange] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [destroyed, setDestroyed] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const formRef = useRef<HTMLFormElement>(null);
  const focusEnd = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sexRef = useRef<HTMLFieldSetElement>(null);
  const changeSexRef = useRef<HTMLButtonElement>(null);
  const cancelSexRef = useRef<HTMLButtonElement>(null);
  const focusSex = useRef(false);
  const focusChangeSex = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // A delayed advance must not pull focus back if the user has moved elsewhere
  // (e.g. drilled into 原文 and returned) during ANSWER_HOLD_MS.
  const keepFocus = useRef(false);
  const submitting = useRef(false);
  const revision = useRef(0);
  const questionId = useId();
  const helpId = useId();
  const confirmationId = useId();
  const formId = useId();
  const confirming = confirmingSexChange || confirmingEnd;
  const questions = sex === '' ? [] : questionnaire.questions.filter((question) => question.sex === 'all' || question.sex === sex);
  const question = questions[questionIndex];
  const completed = questions.filter((item) => answers[item.id] !== undefined).length;
  const hasSession = sex !== '';
  const complete = hasSession && !question && !mutation.result;
  const progress = sex !== '' ? mapQuestionnaireProgress(questionnaire, sex, answers, question?.id) : undefined;

  function cancelAdvance() {
    clearTimeout(timer.current);
    timer.current = undefined;
  }

  useEffect(() => cancelAdvance, []);
  useLayoutEffect(() => {
    if (!visible) return;
    if (keepFocus.current) keepFocus.current = false;
    else if (sex !== '' && !mutation.result) {
      headingRef.current?.focus();
    }
    else if (sex === '' && focusSex.current) {
      sexRef.current?.querySelector('button')?.focus();
      focusSex.current = false;
    }
  }, [sex, questionIndex, mutation.result !== undefined]);
  useLayoutEffect(() => {
    if (!visible) return;
    if (confirming) cancelSexRef.current?.focus();
    else if (focusChangeSex.current) {
      changeSexRef.current?.focus();
      focusChangeSex.current = false;
    }
  }, [confirming]);

  function focusEndAction(button: HTMLButtonElement | null) {
    if (button && !button.disabled && focusEnd.current && visible) {
      focusEnd.current = false;
      button.focus();
    }
  }

  function resetScoring() {
    revision.current += 1;
    submitting.current = false;
    mutation.reset();
    setError(null);
  }

  function changeSex(next: QuestionnaireSex) {
    cancelAdvance();
    resetScoring();
    setSex(next);
    setAnswers({});
    setQuestionIndex(0);
    setDirection('forward');
  }

  function clearSex() {
    cancelAdvance();
    resetScoring();
    setConfirmingSexChange(false);
    setConfirmingEnd(false);
    focusSex.current = true;
    setSex('');
    setAnswers({});
    setQuestionIndex(0);
  }

  function requestSexChange() {
    cancelAdvance();
    if (completed === 0) clearSex();
    else setConfirmingSexChange(true);
  }

  function cancelSexChange() {
    focusChangeSex.current = true;
    setConfirmingSexChange(false);
  }

  function end() {
    fadeDestroyedAnswer(formRef.current, level);
    clearSex();
    setDestroyed((value) => value + 1);
    onEnd?.();
  }

  function requestEnd() {
    cancelAdvance();
    setConfirmingSexChange(false);
    setConfirmingEnd(true);
  }

  function cancelEnd() {
    focusEnd.current = true;
    setConfirmingEnd(false);
  }

  function previous() {
    cancelAdvance();
    resetScoring();
    setDirection('backward');
    setQuestionIndex((index) => Math.max(0, index - 1));
  }

  function answer(value: number) {
    if (!question || mutation.isPending || confirming) return;
    cancelAdvance();
    resetScoring();
    const nextAnswers = { ...answers, [question.id]: value };
    setAnswers(nextAnswers);
    const form = headingRef.current?.closest('form');
    const next = () => {
      timer.current = undefined;
      const focused = document.activeElement;
      keepFocus.current = focused !== null && focused !== document.body && !form?.contains(focused);
      setDirection('forward');
      setQuestionIndex(questionIndex + 1);
      if (questionIndex + 1 === questions.length) score(nextAnswers);
    };
    timer.current = setTimeout(next, ANSWER_HOLD_MS);
  }

  function questionKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || confirming || mutation.isPending
      || (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'))) return;
    if (event.key === 'ArrowLeft' || event.key === 'Backspace') {
      event.preventDefault();
      if (questionIndex > 0) previous();
      return;
    }
    if (!/^[1-5]$/.test(event.key)) return;
    event.preventDefault();
    answer(Number(event.key));
  }

  function score(submittedAnswers: Readonly<Record<string, number>>) {
    if (mutation.isPending || submitting.current || mutation.result || confirming) return;
    if (sex === '') {
      setError('请先选择量表所用性别。');
      sexRef.current?.focus();
      return;
    }
    const missing = questions.findIndex((item) => submittedAnswers[item.id] === undefined);
    if (missing !== -1) {
      cancelAdvance();
      setQuestionIndex(missing);
      setError(`还有 ${questions.length - completed} 题未作答，请补全后查看结果。`);
      headingRef.current?.focus();
      return;
    }
    cancelAdvance();
    setError(null);
    submitting.current = true;
    const submittedRevision = revision.current;
    mutation.submit({ questionnaireId: questionnaire.id, sex, answers: submittedAnswers }, {
      onSettled: () => { if (revision.current === submittedRevision) submitting.current = false; },
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // A native submit may validate an incomplete form or retry a failed request.
    // The final answer owns the only automatic submission after its hold.
    if (!hasSession || completed < questions.length || mutation.isError) score(answers);
  }

  const notes = <>
    <details className="constitution-disclosure constitution-source">
      <summary>量表来源与适用说明</summary>
      <p className="constitution-meta num"><InlineText>{mutation.result
        ? `${mutation.result.sexLabel} · ${mutation.result.questionnaireId} · ${mutation.result.version}`
        : `${questionnaire.title} · ${questionnaire.version}`}</InlineText></p>
      {questionnaire.instructions.map((instruction, index) => <p key={index}>{instruction}</p>)}
      <p>{questionnaire.sourceNote}</p>
      <a href={questionnaire.sourceUrl} target="_blank" rel="noreferrer">查看标准来源（新窗口）</a>
    </details>
    <ConstitutionContextDetails context={context} />
  </>;

  return (
    <div className="constitution-session" onKeyDown={(event) => {
      if (confirming && event.key === 'Escape') { event.preventDefault(); if (confirmingEnd) cancelEnd(); else cancelSexChange(); }
    }}>
      <PanelView enabled={actionsEnabled}
        drilldown={mutation.result ? { title: '体质测评结果', onBack: () => { if (!confirming) previous(); } } : undefined}
        actions={hasSession ? <div className="constitution-actions">
          {mutation.result ? <Button variant="text" disabled={confirming} onClick={previous}><span aria-hidden="true">‹</span> 返回修改</Button> : null}
          <Button ref={focusEndAction} variant="secondary" disabled={confirming} onClick={requestEnd}>结束并销毁答卷</Button>
          {complete && mutation.isError ? <Button type="submit" form={formId} disabled={confirming}>重新计分</Button> : null}
        </div> : undefined} />
      <form ref={formRef} id={formId} className="constitution-answer-form" onSubmit={submit} aria-label="中医体质量表" aria-busy={mutation.isPending}>
        <ConstitutionContext context={context}>
          {progress && !mutation.result ? <section className="constitution-dimensions">
            <div className="constitution-progress-header">
              <div className="constitution-sex-summary">
                <span><InlineText>{`体质维度 · ${sex === 'male' ? '男性版' : '女性版'}`}</InlineText></span>
                <Button ref={changeSexRef} variant="text" disabled={mutation.isPending || confirming} onClick={requestSexChange}>更换</Button>
              </div>
              <span className="constitution-position num" role="img" aria-label={progress.label} aria-live="polite">已答 <b>{progress.completed}</b> / {progress.total}</span>
            </div>
            <div className="constitution-progress-grid" role="list" aria-label="九种体质作答进度">
              {progress.dimensions.map((dimension) => <ConstitutionDimension key={dimension.id} dimension={dimension} />)}
            </div>
          </section> : null}
        </ConstitutionContext>
        {sex === '' ? <fieldset className="constitution-sex" disabled={mutation.isPending} ref={sexRef} tabIndex={-1}>
          <legend>量表所用性别</legend>
          <SegmentedControl label="量表所用性别" compact value={sex} onChange={changeSex}
            segments={[{ value: 'male', label: '男' }, { value: 'female', label: '女' }]} />
          <p className="constitution-meta">仅用于显示对应条目；切换后清空本次作答和结果。</p>
        </fieldset> : null}
        {confirmingSexChange ? <section className="constitution-sex-confirmation" role="group" aria-labelledby={confirmationId}>
          <p id={confirmationId}>更换将清空已作答的 <span className="num">{completed}</span> 题</p>
          <div>
            <Button variant="secondary" onClick={clearSex}>确认</Button>
            <Button ref={cancelSexRef} variant="text" onClick={cancelSexChange}>取消</Button>
          </div>
        </section> : null}
        {confirmingEnd ? <section className="constitution-sex-confirmation" role="group" aria-label="结束并销毁本次答卷">
          <p>结束后将销毁本次答卷和测评结果。</p>
          <div><Button variant="secondary" onClick={end}>确认销毁</Button><Button ref={cancelSexRef} variant="text" onClick={cancelEnd}>取消</Button></div>
        </section> : null}
        <div inert={confirming || undefined}>
        {mutation.result ? (
          <ConstitutionResults assessment={mutation.result} context={context} reveal>{notes}</ConstitutionResults>
        ) : sex !== '' ? (
          <>
            {question ? (
              <div className="constitution-question-screen" data-direction={direction} onKeyDownCapture={(event) => { if (event.key === 'ArrowLeft' || event.key === 'Backspace') questionKey(event); }} onKeyDown={questionKey}>
                <div className="constitution-question-header">
                  <h3 key={question.id} id={questionId} className="constitution-question-title" tabIndex={-1} ref={headingRef}>{question.text}</h3>
                  <p id={helpId} className="constitution-meta num"><InlineText>请患者根据近一年的体验和感觉作答 · 数字键 1–5 · ← 上一题</InlineText></p>
                </div>
                <div key={question.id} role="radiogroup" aria-labelledby={questionId} aria-describedby={helpId}>
                  {questionnaire.options.map((option, index) => (
                    <ScaleOption key={option.value} shortcut={option.value} label={option.label} description={option.description} showDegree
                      checked={answers[question.id] === option.value}
                      tabIndex={answers[question.id] === option.value || (answers[question.id] === undefined && index === 0) ? 0 : -1}
                      onSelect={() => answer(option.value)} />
                  ))}
                </div>
                <div className="constitution-previous"><Button variant="text" disabled={questionIndex === 0} onClick={previous}>上一题</Button></div>
              </div>
            ) : (
              mutation.isError ? <Button variant="text" onClick={previous}>返回修改</Button> : null
            )}
          </>
        ) : <p className="constitution-meta">选择量表所用性别后开始作答，一题一屏，无默认答案。</p>}
        </div>
        {error ? <p role="alert" className="constitution-notice num">{error}</p> : null}
        {mutation.isError ? <p role="alert" className="constitution-notice">测评暂未完成，请核对作答或稍后重新提交。</p> : null}
        {mutation.isPending ? <p role="status" className="constitution-meta">正在按量表规则计分</p> : null}
      </form>
      {destroyed > 0 && !onEnd ? <AnswerDestroyedNotice key={destroyed} /> : null}
      {!mutation.result ? <div className="constitution-notes">{notes}</div> : null}
      <footer className="constitution-session-footer"><InlineText>答卷仅存本次会话，不入库 · 结束即销毁</InlineText></footer>
    </div>
  );
}
