import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '../../../components/design/Button';
import { ScaleOption } from '../../../components/design/ScaleOption';
import { SegmentedControl } from '../../../components/design/SegmentedControl';
import type { ConstitutionContextViewModel, ConstitutionQuestionnaireViewModel, QuestionnaireSex } from '../presentation/map-constitution';
import { useConstitutionAssessment } from '../hooks/useConstitution';
import { ConstitutionResults } from './ConstitutionResults';

export interface ConstitutionFormProps {
  readonly questionnaire: ConstitutionQuestionnaireViewModel;
  readonly context?: ConstitutionContextViewModel;
  readonly onEnd?: () => void;
}

export function ConstitutionForm({ questionnaire, context, onEnd }: ConstitutionFormProps) {
  const mutation = useConstitutionAssessment();
  const [sex, setSex] = useState<QuestionnaireSex | ''>('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirmingSexChange, setConfirmingSexChange] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sexRef = useRef<HTMLFieldSetElement>(null);
  const changeSexRef = useRef<HTMLButtonElement>(null);
  const cancelSexRef = useRef<HTMLButtonElement>(null);
  const focusSex = useRef(false);
  const focusChangeSex = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const advancing = useRef(false);
  const submitting = useRef(false);
  const revision = useRef(0);
  const questionId = useId();
  const helpId = useId();
  const confirmationId = useId();
  const questions = sex === '' ? [] : questionnaire.questions.filter((question) => question.sex === 'all' || question.sex === sex);
  const question = questions[questionIndex];
  const completed = questions.filter((item) => answers[item.id] !== undefined).length;
  const hasContent = Object.keys(answers).length > 0 || mutation.result !== undefined;

  function cancelAdvance() {
    clearTimeout(timer.current);
    timer.current = undefined;
    advancing.current = false;
  }

  useEffect(() => cancelAdvance, []);
  useLayoutEffect(() => {
    if (sex !== '' && !mutation.result) headingRef.current?.focus();
    else if (sex === '' && focusSex.current) {
      sexRef.current?.querySelector('button')?.focus();
      focusSex.current = false;
    }
  }, [sex, questionIndex, mutation.result !== undefined]);
  useLayoutEffect(() => {
    if (confirmingSexChange) cancelSexRef.current?.focus();
    else if (focusChangeSex.current) {
      changeSexRef.current?.focus();
      focusChangeSex.current = false;
    }
  }, [confirmingSexChange]);

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
  }

  function clearSex() {
    cancelAdvance();
    resetScoring();
    setConfirmingSexChange(false);
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
    clearSex();
    onEnd?.();
  }

  function previous() {
    cancelAdvance();
    resetScoring();
    setQuestionIndex((index) => Math.max(0, index - 1));
  }

  function answer(value: number) {
    if (!question || advancing.current || mutation.isPending || confirmingSexChange) return;
    resetScoring();
    setAnswers((current) => ({ ...current, [question.id]: value }));
    advancing.current = true;
    const next = () => {
      advancing.current = false;
      timer.current = undefined;
      setQuestionIndex((index) => index + 1);
    };
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) next();
    else timer.current = setTimeout(next, 160);
  }

  function questionKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !/^[1-5]$/.test(event.key)) return;
    event.preventDefault();
    answer(Number(event.key));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending || submitting.current || mutation.result || confirmingSexChange) return;
    if (sex === '') {
      setError('请先选择量表所用性别。');
      sexRef.current?.focus();
      return;
    }
    const missing = questions.findIndex((item) => answers[item.id] === undefined);
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
    mutation.submit({ questionnaireId: questionnaire.id, sex, answers }, {
      onSettled: () => { if (revision.current === submittedRevision) submitting.current = false; },
    });
  }

  return (
    <div className="constitution-session" onKeyDown={(event) => {
      if (confirmingSexChange && event.key === 'Escape') { event.preventDefault(); cancelSexChange(); }
    }}>
      <form className="constitution-answer-form" onSubmit={submit} aria-label="中医体质量表" aria-busy={mutation.isPending}>
        {sex === '' ? <fieldset className="constitution-sex" disabled={mutation.isPending} ref={sexRef} tabIndex={-1}>
          <legend>量表所用性别</legend>
          <SegmentedControl label="量表所用性别" compact value={sex} onChange={changeSex}
            segments={[{ value: 'male', label: '男' }, { value: 'female', label: '女' }]} />
          <p className="constitution-meta">仅用于显示对应条目；切换后清空本次作答和结果。</p>
        </fieldset> : <div className="constitution-sex-summary">
          <span>{sex === 'male' ? '男性版' : '女性版'} · </span>
          <Button ref={changeSexRef} variant="text" disabled={mutation.isPending || confirmingSexChange} onClick={requestSexChange}>更换</Button>
        </div>}
        {confirmingSexChange ? <section className="constitution-sex-confirmation" role="group" aria-labelledby={confirmationId}>
          <p id={confirmationId}>更换将清空已作答的 {completed} 题</p>
          <div>
            <Button variant="secondary" onClick={clearSex}>确认</Button>
            <Button ref={cancelSexRef} variant="text" onClick={cancelSexChange}>取消</Button>
          </div>
        </section> : null}
        <div inert={confirmingSexChange || undefined}>
        {mutation.result ? (
          <ConstitutionResults assessment={mutation.result} context={context} onBack={previous} />
        ) : sex !== '' ? (
          <>
            <div className="constitution-progress-header">
              <span>{questionnaire.standard} · {sex === 'male' ? '男性版' : '女性版'} · {questions.length} 题</span>
              <span className="constitution-position" aria-live="polite">{Math.min(questionIndex + 1, questions.length)}/{questions.length}</span>
            </div>
            <div className="constitution-progress-grid" role="img" aria-label={`已答 ${completed} / ${questions.length} 题${question ? `，当前第 ${questionIndex + 1} 题` : '，全部作答完成'}`}>
              {questions.map((item, index) => <span key={item.id} data-state={index === questionIndex ? 'current' : answers[item.id] !== undefined ? 'answered' : 'unanswered'} />)}
            </div>
            {question ? (
              <div className="constitution-question-screen" key={question.id} onKeyDown={questionKey}>
                <h3 id={questionId} className="constitution-question-title" tabIndex={-1} ref={headingRef}>{question.text}</h3>
                <p id={helpId} className="constitution-meta">请患者根据近一年的体验和感觉作答 · 可按数字键 1–5</p>
                <div role="radiogroup" aria-labelledby={questionId} aria-describedby={helpId}>
                  {questionnaire.options.map((option, index) => (
                    <ScaleOption key={option.value} shortcut={option.value} label={option.label} description={option.description}
                      checked={answers[question.id] === option.value}
                      tabIndex={answers[question.id] === option.value || (answers[question.id] === undefined && index === 0) ? 0 : -1}
                      onSelect={() => answer(option.value)} />
                  ))}
                </div>
                <div className="constitution-previous"><Button variant="text" disabled={questionIndex === 0} onClick={previous}>上一题</Button></div>
              </div>
            ) : (
              <div className="constitution-complete">
                <h3 tabIndex={-1} ref={headingRef}>{questions.length} 题已全部作答</h3>
                <p>提交后计算九种体质的转化分</p>
                <Button key="view-result" variant={context?.birth ? 'secondary' : 'primary'} type="submit" disabled={mutation.isPending}>{mutation.isPending ? '正在计算…' : '查看结果'}</Button>
                <Button variant="text" disabled={mutation.isPending} onClick={previous}>返回修改</Button>
              </div>
            )}
          </>
        ) : <p className="constitution-meta">选择量表所用性别后开始作答，一题一屏，无默认答案。</p>}
        </div>
        {error ? <p role="alert" className="constitution-notice">{error}</p> : null}
        {mutation.isError ? <p role="alert" className="constitution-notice">测评暂未完成，请核对作答或稍后重新提交。</p> : null}
        {mutation.isPending ? <p role="status" className="constitution-meta">正在按量表规则计分</p> : null}
      </form>
      <details className="constitution-source">
        <summary>量表来源与适用说明</summary>
        <p>{questionnaire.title} · {questionnaire.version}</p>
        {questionnaire.instructions.map((instruction, index) => <p key={index}>{instruction}</p>)}
        <p>{questionnaire.sourceNote}</p>
        <a href={questionnaire.sourceUrl} target="_blank" rel="noreferrer">查看标准来源（新窗口）</a>
      </details>
      {hasContent ? <div className="constitution-session-actions"><Button variant="secondary" onClick={end}>结束并销毁答卷</Button></div> : null}
      <footer className="constitution-session-footer">答卷仅存本次会话，不入库 · 结束即销毁</footer>
    </div>
  );
}
