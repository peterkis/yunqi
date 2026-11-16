export type ConstitutionSex = 'male' | 'female';

export type ConstitutionTypeId =
  | 'balanced'
  | 'qi_deficiency'
  | 'yang_deficiency'
  | 'yin_deficiency'
  | 'phlegm_dampness'
  | 'damp_heat'
  | 'blood_stasis'
  | 'qi_stagnation'
  | 'special_diathesis';

export type ConstitutionStatus = 'yes' | 'basically' | 'tendency' | 'no';

export interface ConstitutionQuestion {
  readonly id: string;
  readonly text: string;
  readonly sex: 'all' | ConstitutionSex;
}

export interface ConstitutionScale {
  readonly id: ConstitutionTypeId;
  readonly name: string;
  readonly items: readonly {
    readonly questionId: string;
    readonly reverse: boolean;
  }[];
}

export interface ConstitutionQuestionnaire {
  readonly id: string;
  readonly version: string;
  readonly title: string;
  readonly standard: string;
  readonly sourceUrl: string;
  readonly sourceNote: string;
  readonly instructions: string;
  readonly questions: readonly ConstitutionQuestion[];
  readonly scales: readonly ConstitutionScale[];
  readonly options: readonly { readonly value: number; readonly label: string }[];
}

export interface ConstitutionAssessmentInput {
  readonly questionnaireId: string;
  readonly sex: ConstitutionSex;
  readonly answers: Readonly<Record<string, number>>;
}

export interface ConstitutionScaleResult {
  readonly id: ConstitutionTypeId;
  readonly name: string;
  readonly itemCount: number;
  readonly rawScore: number;
  /** The exact conversion is used for classification; display rounding is separate. */
  readonly score: number;
  readonly status: ConstitutionStatus;
  readonly label: string;
}

export interface ConstitutionAssessment {
  readonly questionnaireId: string;
  readonly version: string;
  readonly sex: ConstitutionSex;
  readonly results: readonly ConstitutionScaleResult[];
  readonly matchedTypes: readonly ConstitutionTypeId[];
  readonly tendencyTypes: readonly ConstitutionTypeId[];
  readonly summary: string;
  readonly boundaryNote: string;
}
