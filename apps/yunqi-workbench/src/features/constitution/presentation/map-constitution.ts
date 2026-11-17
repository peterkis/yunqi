import type { ConstitutionAssessmentDto, ConstitutionQuestionnaireDto } from '@yunqi/contracts';
import type { BirthComparisonViewModel, LearningViewModel } from '../../yunqi/presentation/map-learning';
import type { YunQiTimeViewModel } from '../../yunqi/presentation/view-model';

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
  readonly options: readonly { readonly value: 1 | 2 | 3 | 4 | 5; readonly label: string; readonly description: string }[];
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
  readonly detail: string;
  readonly qiDetail: string;
  readonly movementDetail: string;
}

function contextFacts(learning: LearningViewModel) {
  const { summary, currentStep } = learning.facts;
  return {
    summary: `${summary.stemBranch.ganzhi} · ${currentStep.name} · 客气${currentStep.guestQi}`,
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
  readonly matchedTypes: readonly { readonly id: string; readonly name: string }[];
  readonly tendencyTypes: readonly { readonly id: string; readonly name: string }[];
  readonly boundaryNote: string;
  readonly results: readonly {
    readonly id: string;
    readonly name: string;
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
    options: value.options.map((option) => ({
      value: option.value as 1 | 2 | 3 | 4 | 5,
      label: option.label.split('（')[0],
      description: OPTION_DESCRIPTIONS[option.value],
    })) };
}

export function mapAssessment(value: ConstitutionAssessmentDto): ConstitutionAssessmentViewModel {
  // Presentation follows the API's statuses, never score thresholds or ranking.
  const namedType = (id: string) => ({ id, name: value.results.find((result) => result.id === id)!.name });
  const matchedTypes = value.matchedTypes.map(namedType);
  const tendencyTypes = value.tendencyTypes.map(namedType);
  const balanced = value.results.find((result) => result.id === 'balanced');
  const decision = balanced?.status === 'yes' ? balanced.name
    : balanced?.status === 'basically' ? `基本是${balanced.name}`
    : matchedTypes.length === 1 ? matchedTypes[0].name
    : matchedTypes.length > 1 ? '偏颇质兼夹' : '未达明确类型';
  return { questionnaireId: value.questionnaireId, version: value.version, summary: value.summary,
    sexLabel: value.sex === 'male' ? '男性版' : '女性版',
    decision, matchedTypes, tendencyTypes,
    boundaryNote: value.boundaryNote,
    results: value.results.map((result) => ({
      id: result.id, name: result.name, label: result.label, status: result.status, score: result.score,
      displayScore: result.score.toFixed(1), rawScore: result.rawScore, itemCount: result.itemCount,
      tone: result.status === 'yes' ? 'primary' : result.status === 'no' ? 'neutral' : 'secondary',
      fillWidth: `${result.score}%`,
      chartLabel: `${result.name}，转化分 ${result.score.toFixed(1)} 分（满分100），判定${result.label}；参考刻度30与40；原始分${result.rawScore}，${result.itemCount}个条目。`,
    })) };
}
