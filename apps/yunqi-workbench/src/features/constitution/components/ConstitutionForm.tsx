import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, Mars, Venus } from 'lucide-react';
import { Button } from '../../../components/design/Button';
import { InlineText } from '../../../components/design/InlineText';
import { MoreRowSummary } from '../../../components/design/MoreRow';
import { ScaleOption } from '../../../components/design/ScaleOption';
import { SegmentedControl } from '../../../components/design/SegmentedControl';
import { SourceCitation } from '../../../components/design/SourceCitation';
import { PanelView } from '../../../components/layout/PanelView';
import { useSessionVisible } from '../../../components/layout/SessionVisibility';
import { useMotionLevel } from '../../../providers/MotionProvider';
import type { ConstitutionContextViewModel, ConstitutionQuestionnaireViewModel, QuestionnaireSex } from '../presentation/map-constitution';
import { mapQuestionnaireProgress } from '../presentation/map-constitution';
import { useConstitutionAssessment } from '../hooks/useConstitution';
import { ConstitutionResults } from './ConstitutionResults';
import { ConstitutionActionBar } from './ConstitutionActionBar';
import { ConstitutionContext, ConstitutionContextDetails } from './ConstitutionContext';
import { ConstitutionDimension } from './ConstitutionDimension';
import { FloatingConfirmHud } from './FloatingConfirmHud';
import { fadeDestroyedAnswer } from './destroy-answer-visual';

export const ANSWER_HOLD_MS = 240;

const editions = ([
  { value: 'male', title: '男性量表', Icon: Mars },
  { value: 'female', title: '女性量表', Icon: Venus },
] as const).map(({ value, title, Icon }) => ({
  value,
  label: <>
    <span className="constitution-edition-art" data-edition={value} aria-hidden="true">
      <Icon strokeWidth={2} focusable="false" />
    </span>
    <span className="constitution-edition-icon" data-edition={value} aria-hidden="true"><Icon /></span>
    <strong className="constitution-edition-title">{title}</strong>
    <span className="constitution-edition-action" aria-hidden="true">开始作答 <ArrowRight /></span>
  </>,
}));

export interface ConstitutionFormProps {
  readonly questionnaire: ConstitutionQuestionnaireViewModel;
  readonly context?: ConstitutionContextViewModel;
  readonly onSessionChange?: (active: boolean) => void;
  readonly actionsEnabled?: boolean;
}

export function ConstitutionForm({ questionnaire, context, onSessionChange, actionsEnabled = true }: ConstitutionFormProps) {
  const mutation = useConstitutionAssessment();
  const visible = useSessionVisible();
  const level = useMotionLevel();
  const [sex, setSex] = useState<QuestionnaireSex | ''>('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirmingSexChange, setConfirmingSexChange] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sexRef = useRef<HTMLFieldSetElement>(null);
  const changeSexRef = useRef<HTMLButtonElement>(null);
  const focusSex = useRef(false);
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
  const dismissSexChange = useCallback(() => setConfirmingSexChange(false), []);
  useEffect(() => { if (!visible) dismissSexChange(); }, [visible, dismissSexChange]);

  function resetScoring() {
    revision.current += 1;
    submitting.current = false;
    mutation.reset();
    setError(null);
  }

  function changeSex(next: QuestionnaireSex) {
    cancelAdvance();
    resetScoring();
    onSessionChange?.(true);
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
    setConfirmingEnd(false);
    if (completed === 0) clearSex();
    else setConfirmingSexChange(open => !open);
  }

  function end() {
    fadeDestroyedAnswer(formRef.current, level);
    clearSex();
    onSessionChange?.(false);
  }

  function requestEnd() {
    cancelAdvance();
    setConfirmingSexChange(false);
    setConfirmingEnd(true);
  }

  function cancelEnd() {
    setConfirmingEnd(false);
  }

  function previous() {
    cancelEnd();
    cancelAdvance();
    resetScoring();
    setDirection('backward');
    setQuestionIndex((index) => Math.max(0, index - 1));
  }

  function answer(value: number) {
    if (!question || mutation.isPending) return;
    dismissSexChange();
    cancelEnd();
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
    if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || confirmingSexChange || mutation.isPending
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
    if (mutation.isPending || submitting.current || mutation.result) return;
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
    if (!confirming && (!hasSession || completed < questions.length || mutation.isError)) score(answers);
  }

  const notes = <>
    <details className="constitution-disclosure constitution-source">
      <MoreRowSummary>量表来源与适用说明</MoreRowSummary>
      <p className="constitution-meta num"><InlineText>{mutation.result
        ? `${mutation.result.sexLabel} · ${mutation.result.questionnaireId} · ${mutation.result.version}`
        : `${questionnaire.title} · ${questionnaire.version}`}</InlineText></p>
      {questionnaire.instructions.map((instruction, index) => <p key={index}>{instruction}</p>)}
      <p>{questionnaire.sourceNote}</p>
      <SourceCitation title={`${questionnaire.standard} · ${questionnaire.title}`}>{questionnaire.standard}</SourceCitation>
    </details>
    <ConstitutionContextDetails context={context} />
  </>;
  const disclosureRows = !mutation.result && <div className="constitution-notes">{notes}</div>;
  const answering = Boolean(question && !mutation.result);
  const actions = hasSession ? <ConstitutionActionBar confirming={confirmingEnd}
    onRequest={requestEnd} onCancel={cancelEnd} onDestroy={end}>
    {answering && <Button variant="text" disabled={questionIndex === 0} onClick={previous}>
      <ArrowLeft aria-hidden="true" />上一题
    </Button>}
    {mutation.result && <Button variant="text" onClick={previous}><span aria-hidden="true">‹</span> 返回修改</Button>}
    {complete && mutation.isError && <Button type="submit" form={formId}>重新计分</Button>}
  </ConstitutionActionBar> : undefined;

  return (
    <div className="constitution-session" data-entry={!hasSession || undefined} onKeyDown={(event) => {
      if (confirmingEnd && event.key === 'Escape') { event.preventDefault(); cancelEnd(); }
    }}>
      <PanelView enabled={actionsEnabled}
        drilldown={mutation.result ? { title: '体质测评结果', onBack: previous } : undefined}
        actions={answering ? undefined : actions} />
      <form ref={formRef} id={formId} className="constitution-answer-form" onSubmit={submit} aria-label="中医体质量表" aria-busy={mutation.isPending}>
        <ConstitutionContext context={context}>
          {progress && !mutation.result ? <section className="constitution-dimensions">
            <div className="constitution-progress-header">
              <div className="constitution-sex-summary">
                <span>体质维度 · </span>
                <span className="constitution-edition-badge" data-edition={sex}>{sex === 'male' ? '男性版' : '女性版'}</span>
                <Button ref={changeSexRef} variant="text" disabled={mutation.isPending} onClick={requestSexChange}
                  aria-haspopup={completed ? 'dialog' : undefined} aria-expanded={completed ? confirmingSexChange : undefined}
                  aria-controls={completed ? confirmationId : undefined}>更换</Button>
              </div>
              <span className="constitution-position num" role="img" aria-label={progress.label} aria-live="polite">已答 <b>{progress.completed}</b> / {progress.total}</span>
              {completed > 0 && <FloatingConfirmHud id={confirmationId} trigger={changeSexRef}
                open={confirmingSexChange && visible} message={`更换将清空已作答的 ${completed} 题`}
                onDismiss={dismissSexChange} onConfirm={clearSex} />}
            </div>
            <div className="constitution-progress-grid" role="list" aria-label="九种体质作答进度">
              {progress.dimensions.map((dimension) => <ConstitutionDimension key={dimension.id} dimension={dimension} />)}
            </div>
          </section> : null}
        </ConstitutionContext>
        {sex === '' ? <fieldset className="constitution-sex" disabled={mutation.isPending} ref={sexRef} tabIndex={-1}>
          <legend>选择量表所用性别以开始作答</legend>
          <p id={helpId} className="constitution-meta"><InlineText>一题一屏 · 无默认答案 · 切换将清空作答</InlineText></p>
          <SegmentedControl label="量表所用性别" describedBy={helpId} value={sex} onChange={changeSex}
            segments={editions} slidingIndicator={false} />
        </fieldset> : null}
        {hasSession && <div>
          {mutation.result ? (
            <ConstitutionResults assessment={mutation.result} context={context} reveal>{notes}</ConstitutionResults>
          ) : question ? (
            <div className="constitution-question-screen" data-direction={direction} onKeyDownCapture={(event) => { if (event.key === 'ArrowLeft' || event.key === 'Backspace') questionKey(event); }} onKeyDown={questionKey}>
              <div className="constitution-question-header">
                <h3 key={question.id} id={questionId} className="constitution-question-title" tabIndex={-1} ref={headingRef}>{question.text}</h3>
                <p id={helpId} className="constitution-meta num">
                  <span>请患者根据近一年的体验和感觉作答</span>{' '}
                  <span className="constitution-question-shortcuts"><InlineText>数字键 1–5 · ← 上一题</InlineText></span>
                </p>
              </div>
              <div key={question.id} role="radiogroup" aria-labelledby={questionId} aria-describedby={helpId}>
                {questionnaire.options.map((option, index) => (
                  <ScaleOption key={option.value} shortcut={option.value} label={option.label} description={option.description} showDegree
                    checked={answers[question.id] === option.value}
                    tabIndex={answers[question.id] === option.value || (answers[question.id] === undefined && index === 0) ? 0 : -1}
                    onSelect={() => answer(option.value)} />
                ))}
              </div>
            </div>
          ) : mutation.isError ? <Button variant="text" onClick={previous}>返回修改</Button> : null}
        </div>}
        {answering && actions}
        {error ? <p role="alert" className="constitution-notice num">{error}</p> : null}
        {mutation.isError ? <p role="alert" className="constitution-notice">测评暂未完成，请核对作答或稍后重新提交。</p> : null}
        {mutation.isPending ? <p role="status" className="constitution-meta">正在按量表规则计分</p> : null}
      </form>
      {hasSession && disclosureRows}
      {!hasSession && <footer className="constitution-session-footer"><InlineText>答卷仅存本次会话，不入库 · 结束即销毁</InlineText></footer>}
      {!hasSession && disclosureRows}
    </div>
  );
}
