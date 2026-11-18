import type { ConstitutionAssessmentDto, ConstitutionQuestionnaireDto } from '@yunqi/contracts';
import type { BirthComparisonViewModel, LearningViewModel } from '../../yunqi/presentation/map-learning';
import type { ElementKind, YunQiTimeViewModel } from '../../yunqi/presentation/view-model';

export type QuestionnaireSex = 'male' | 'female';

export interface ConstitutionQuestionnaireViewModel {
  readonly id: ConstitutionQuestionnaireDto['id'];
  readonly version: string;
  readonly title: string;
  readonly standard: string;
  readonly sourceUrl: string;
  readonly sourceNote: string;
  readonly instructions: readonly string[];
  readonly questions: readonly { readonly id: string; readonly text: string; readonly sex: 'all' | QuestionnaireSex }[];
  readonly scales: readonly { readonly id: string; readonly name: string; readonly shortName: string; readonly questionIds: readonly string[] }[];
  readonly options: readonly { readonly value: 1 | 2 | 3 | 4 | 5; readonly label: string; readonly description: string }[];
}

export interface ConstitutionProgressViewModel {
  readonly completed: number;
  readonly total: number;
  readonly label: string;
  readonly dimensions: readonly {
    readonly id: string;
    readonly shortName: string;
    readonly answered: boolean;
    readonly current: boolean;
    readonly count: string;
    readonly label: string;
    readonly fillWidth: string;
  }[];
}

export interface ConstitutionContextViewModel {
  readonly current: ConstitutionContextFactsViewModel & {
    readonly time: YunQiTimeViewModel;
    readonly ruleVersion: string;
    readonly learningRuleVersion: string;
    readonly contractId: string;
  };
  readonly birth?: {
    readonly ambiguous: boolean;
    readonly precision: 'date' | 'time';
    readonly candidates: readonly (ConstitutionContextFactsViewModel & { readonly label: string; readonly from: YunQiTimeViewModel; readonly until: YunQiTimeViewModel })[];
  };
}

interface ConstitutionContextFactsViewModel {
  readonly summary: string;
  readonly element: ElementKind | undefined;
  readonly yearSummary: string;
  readonly yearElement: ElementKind | undefined;
  readonly guestQiSummary: string;
  readonly detail: string;
  readonly qiDetail: string;
  readonly movementDetail: string;
}

function contextFacts(learning: LearningViewModel) {
  const { summary, currentStep } = learning.facts;
  return {
    summary: `${summary.stemBranch.ganzhi} · ${currentStep.name} · 客气${currentStep.guestQi}`,
    element: currentStep.guestElement,
    yearSummary: `${summary.stemBranch.ganzhi} · ${summary.suiYun.element}运${summary.suiYun.state}`,
    yearElement: learning.facts.annualElements.suiYun,
    guestQiSummary: `${currentStep.name} · 客气${currentStep.guestQi}`,
    detail: `${summary.suiYun.element}运${summary.suiYun.state} · 司天${summary.sitian} · 在泉${summary.zaiquan}`,
    qiDetail: `${currentStep.name} · 主气${currentStep.hostQi} · 客气${currentStep.guestQi}`,
    movementDetail: `${learning.currentMovement.name} · 主运${learning.currentMovement.hostLabel} · 客运${learning.currentMovement.guestLabel}`,
  };
}

/** Only projects already loaded ViewModels; never fetches or infers a candidate. */
export function mapConstitutionContext(current: LearningViewModel, comparison?: BirthComparisonViewModel): ConstitutionContextViewModel {
  return {
    current: { ...contextFacts(current), time: current.facts.inputTime,
      ruleVersion: current.facts.ruleVersion, learningRuleVersion: current.ruleVersion, contractId: current.facts.contractId },
    ...(comparison ? { birth: {
      ambiguous: comparison.ambiguous,
      precision: comparison.birthPrecision,
      candidates: comparison.candidates.map((candidate) => ({
        label: candidate.label, ...contextFacts(candidate.learning), from: candidate.from, until: candidate.until,
      })),
    } } : {}),
  };
}

export interface ConstitutionAssessmentViewModel {
  readonly questionnaireId: string;
  readonly version: string;
  readonly sexLabel: string;
  readonly summary: string;
  readonly decision: string;
  readonly referenceSummary: string;
  readonly matchedTypes: readonly { readonly id: string; readonly name: string; readonly shortName: string }[];
  readonly tendencyTypes: readonly { readonly id: string; readonly name: string; readonly shortName: string }[];
  readonly boundaryNote: string;
  readonly results: readonly {
    readonly id: string;
    readonly name: string;
    readonly shortName: string;
    readonly label: string;
    readonly status: 'yes' | 'tendency' | 'basically' | 'no';
    readonly score: number;
    readonly displayScore: string;
    readonly rawScore: number;
    readonly itemCount: number;
    readonly tone: 'primary' | 'secondary' | 'neutral';
    readonly fillWidth: string;
    readonly chartLabel: string;
  }[];
}

const OPTION_DESCRIPTIONS: Readonly<Record<number, string>> = { 1: '根本不', 2: '有一点', 3: '有些', 4: '相当', 5: '非常' };

export function mapQuestionnaire(value: ConstitutionQuestionnaireDto): ConstitutionQuestionnaireViewModel {
  return { id: value.id, version: value.version, title: value.title, standard: value.standard,
    sourceUrl: value.sourceUrl, sourceNote: value.sourceNote, instructions: [...value.instructions],
    questions: value.questions.map((question) => ({ id: question.id, text: question.text, sex: question.sex })),
    // The API preserves the standard appendix order. Item direction is not
    // needed here: progress counts answers, independently of scoring.
    scales: value.scales.map((scale) => ({ id: scale.id, name: scale.name, shortName: scale.name.replace(/质$/, ''),
      questionIds: scale.items.map((item) => item.questionId) })),
    options: value.options.map((option) => ({
      value: option.value as 1 | 2 | 3 | 4 | 5,
      label: option.label.split('（')[0],
      description: OPTION_DESCRIPTIONS[option.value],
    })) };
}

/** Counts the DTO's memberships after sex filtering, including shared items. */
export function mapQuestionnaireProgress(questionnaire: ConstitutionQuestionnaireViewModel, sex: QuestionnaireSex,
  answers: Readonly<Record<string, number>>, currentQuestionId?: string): ConstitutionProgressViewModel {
  const questions = questionnaire.questions.filter((question) => question.sex === 'all' || question.sex === sex);
  const applicable = new Set(questions.map((question) => question.id));
  const completed = questions.filter((question) => answers[question.id] !== undefined).length;
  const position = questions.findIndex((question) => question.id === currentQuestionId);
  return {
    completed, total: questions.length,
    label: `已答 ${completed} / ${questions.length} 题${position >= 0 ? `，当前第 ${position + 1} 题` : '，全部作答完成'}`,
    dimensions: questionnaire.scales.map((scale) => {
      const ids = scale.questionIds.filter((id) => applicable.has(id));
      const count = ids.filter((id) => answers[id] !== undefined).length;
      const current = currentQuestionId !== undefined && ids.includes(currentQuestionId);
      const complete = ids.length > 0 && count === ids.length;
      return { id: scale.id, shortName: scale.shortName, answered: count > 0, current,
        count: complete ? '✓' : `${count}/${ids.length}`,
        label: `${scale.name}：${count}/${ids.length}${complete ? '，全部答完' : ''}${current ? '，当前题所属维度' : ''}`,
        fillWidth: `${ids.length > 0 ? count / ids.length * 100 : 0}%` };
    }),
  };
}

export function mapAssessment(value: ConstitutionAssessmentDto): ConstitutionAssessmentViewModel {
  // Presentation follows the API's statuses, never score thresholds or ranking.
  const namedType = (id: string) => {
    const name = value.results.find((result) => result.id === id)!.name;
    return { id, name, shortName: name.replace(/质$/, '') };
  };
  const matchedTypes = value.matchedTypes.map(namedType);
  const tendencyTypes = value.tendencyTypes.map(namedType);
  const balanced = value.results.find((result) => result.id === 'balanced');
  const decision = balanced?.status === 'yes' ? balanced.name
    : balanced?.status === 'basically' ? `基本是${balanced.name}`
    : matchedTypes.length === 1 ? matchedTypes[0].name
    : matchedTypes.length > 1 ? '偏颇质兼夹' : '未达明确类型';
  const referenceSummary = [
    matchedTypes.map((type) => type.shortName).join('、'),
    tendencyTypes.length ? `倾向${tendencyTypes.map((type) => type.shortName).join('、')}` : '',
  ].filter(Boolean).join(' · ') || decision;
  return { questionnaireId: value.questionnaireId, version: value.version, summary: value.summary,
    sexLabel: value.sex === 'male' ? '男性版' : '女性版',
    decision, referenceSummary, matchedTypes, tendencyTypes,
    boundaryNote: value.boundaryNote,
    results: value.results.map((result) => ({
      id: result.id, name: result.name, shortName: result.name.replace(/质$/, ''), label: result.label, status: result.status, score: result.score,
      displayScore: result.score.toFixed(1), rawScore: result.rawScore, itemCount: result.itemCount,
      tone: result.status === 'yes' ? 'primary' : result.status === 'tendency' ? 'secondary' : 'neutral',
      fillWidth: `${result.score}%`,
      chartLabel: `${result.name}，转化分 ${result.score.toFixed(1)} 分（满分100），判定${result.label}；参考刻度30与40；原始分${result.rawScore}，${result.itemCount}个条目。`,
    })) };
}
