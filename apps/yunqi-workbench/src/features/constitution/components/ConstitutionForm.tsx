import { useRef, useState, type FormEvent } from 'react';
import { mapAssessment, type ConstitutionQuestionnaireViewModel, type QuestionnaireSex } from '../presentation/map-constitution';
import { useConstitutionAssessment } from '../hooks/useConstitution';
import { ConstitutionResults } from './ConstitutionResults';

const QUESTIONS_PER_PAGE = 6;

export function ConstitutionForm({ questionnaire }: { readonly questionnaire: ConstitutionQuestionnaireViewModel }) {
  const mutation = useConstitutionAssessment();
  const [sex, setSex] = useState<QuestionnaireSex | ''>('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [pageIndex, setPageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sexRef = useRef<HTMLFieldSetElement>(null);
  const questions = sex === '' ? [] : questionnaire.questions.filter((question) => question.sex === 'all' || question.sex === sex);
  const pageCount = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  const pageQuestions = questions.slice(pageIndex * QUESTIONS_PER_PAGE, (pageIndex + 1) * QUESTIONS_PER_PAGE);
  const completed = questions.filter((question) => answers[question.id] !== undefined).length;

  function changeSex(next: QuestionnaireSex) {
    setSex(next);
    setAnswers({});
    setPageIndex(0);
    setError(null);
    mutation.reset();
  }

  function clear() {
    setSex('');
    setAnswers({});
    setPageIndex(0);
    setError(null);
    mutation.reset();
    sexRef.current?.focus();
  }

  function changePage(next: number) {
    setPageIndex(next);
    setError(null);
    headingRef.current?.focus();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    if (sex === '') {
      setError('请先选择量表所用性别。');
      sexRef.current?.focus();
      return;
    }
    const missing = questions.findIndex((question) => answers[question.id] === undefined);
    if (missing !== -1) {
      setPageIndex(Math.floor(missing / QUESTIONS_PER_PAGE));
      setError(`还有 ${questions.length - completed} 题未作答，请补全后生成结果。`);
      headingRef.current?.focus();
      return;
    }
    setError(null);
    mutation.mutate({ questionnaireId: questionnaire.id, sex, answers });
  }

  return (
    <div className="constitution-form-area">
      <div className="questionnaire-intro">
        <h3>{questionnaire.title}</h3>
        <p className="questionnaire-version">{questionnaire.standard} · {questionnaire.version}</p>
        {questionnaire.instructions.map((instruction, index) => <p key={index}>{instruction}</p>)}
      </div>
      <form className="constitution-form" onSubmit={submit} aria-label="中医体质量表">
        <fieldset className="sex-fieldset" disabled={mutation.isPending} ref={sexRef} tabIndex={-1}>
          <legend>量表所用性别</legend>
          <p className="form-note">用于显示对应条目。切换后将清空本次作答和结果。</p>
          <div className="sex-options">
            <label><input type="radio" name="constitution-sex" value="male" checked={sex === 'male'} onChange={() => changeSex('male')} />男</label>
            <label><input type="radio" name="constitution-sex" value="female" checked={sex === 'female'} onChange={() => changeSex('female')} />女</label>
          </div>
        </fieldset>
        {sex !== '' ? (
          <>
            <div className="questionnaire-progress" aria-live="polite">
              <span>已答 {completed} / {questions.length} 题</span>
              <progress value={completed} max={questions.length} aria-label="量表作答进度" />
            </div>
            <h3 className="question-group-heading" tabIndex={-1} ref={headingRef}>第 {pageIndex + 1} 组 / 共 {pageCount} 组</h3>
            <div className="question-list">
              {pageQuestions.map((question, position) => (
                <fieldset className="constitution-question" key={question.id} disabled={mutation.isPending}>
                  <legend><span className="question-number">{pageIndex * QUESTIONS_PER_PAGE + position + 1}</span>{question.text}</legend>
                  <div className="answer-options">
                    {questionnaire.options.map((option) => (
                      <label key={option.value} className={answers[question.id] === option.value ? 'is-selected' : ''}>
                        <input type="radio" name={`question-${question.id}`} value={option.value} checked={answers[question.id] === option.value} onChange={() => { setAnswers((current) => ({ ...current, [question.id]: option.value })); setError(null); mutation.reset(); }} />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="question-page-actions">
              <button className="secondary-button" type="button" disabled={pageIndex === 0 || mutation.isPending} onClick={() => changePage(pageIndex - 1)}>上一组</button>
              {/* Keep the clicked navigation node from acquiring a submit default action on the last page. */}
              {pageIndex < pageCount - 1 ? (
                <button key="next-group" className="primary-button" type="button" disabled={mutation.isPending} onClick={() => changePage(pageIndex + 1)}>下一组</button>
              ) : (
                <button key="submit-assessment" className="primary-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? '正在计算…' : '生成体质测评结果'}</button>
              )}
            </div>
          </>
        ) : <p className="learning-empty">选择量表所用性别后开始作答，每组最多 6 题。</p>}
        <div className="assessment-reset">
          <button className="text-button" type="button" onClick={clear} disabled={mutation.isPending}>清空本次测评</button>
          <span className="form-note">不保存身份或作答；离开页面后清空。</span>
        </div>
      </form>
      {error ? <p role="alert" className="form-error">{error}</p> : null}
      {mutation.isError ? <p role="alert" className="form-error">测评暂未完成，请核对作答或稍后重新提交。</p> : null}
      {mutation.isPending ? <p role="status">正在按量表规则计分</p> : null}
      {mutation.data ? <ConstitutionResults assessment={mapAssessment(mutation.data)} /> : null}
      <details className="workbench-disclosure questionnaire-source">
        <summary>量表来源与适用说明</summary>
        <div className="learning-notes">
          <p>{questionnaire.sourceNote}</p>
          <a href={questionnaire.sourceUrl} target="_blank" rel="noreferrer">查看标准来源（新窗口）</a>
        </div>
      </details>
    </div>
  );
}
