import type { ConstitutionAssessmentDto, ConstitutionQuestionnaireDto } from '@yunqi/contracts';

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
  readonly options: readonly { readonly value: number; readonly label: string }[];
}

export interface ConstitutionAssessmentViewModel {
  readonly questionnaireId: string;
  readonly version: string;
  readonly summary: string;
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
  }[];
}

export function mapQuestionnaire(value: ConstitutionQuestionnaireDto): ConstitutionQuestionnaireViewModel {
  return { id: value.id, version: value.version, title: value.title, standard: value.standard,
    sourceUrl: value.sourceUrl, sourceNote: value.sourceNote, instructions: [...value.instructions],
    questions: value.questions.map((question) => ({ id: question.id, text: question.text, sex: question.sex })),
    options: value.options.map((option) => ({ value: option.value, label: option.label })) };
}

export function mapAssessment(value: ConstitutionAssessmentDto): ConstitutionAssessmentViewModel {
  return { questionnaireId: value.questionnaireId, version: value.version, summary: value.summary,
    boundaryNote: value.boundaryNote, results: value.results.map((result) => ({
      id: result.id, name: result.name, label: result.label, status: result.status, score: result.score,
      displayScore: result.score.toFixed(1), rawScore: result.rawScore, itemCount: result.itemCount,
    })) };
}
