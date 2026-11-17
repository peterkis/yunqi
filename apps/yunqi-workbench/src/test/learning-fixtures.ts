import { vi } from 'vitest';
import type { YunQiClient } from '@yunqi/client';
import type {
  BirthComparisonDto,
  ConstitutionAssessmentDto,
  ConstitutionQuestionnaireDto,
  YunQiLearningDto,
} from '@yunqi/contracts';
import { createYunQiCalculationDto } from './yunqi-fixtures';

// Deliberately small synthetic presentation fixtures, not clinical reference cases.
export function createLearningDto(): YunQiLearningDto {
  const facts = createYunQiCalculationDto();
  const movement = {
    index: 2,
    name: '二之运',
    start: facts.currentStep.start,
    end: facts.currentStep.end,
    host: { element: '火', state: '太过', tone: '太徵' },
    guest: { element: '木', state: '不及', tone: '少角' },
    boundaryMethod: '测试交运口径（教学口径，待专家确认）',
    explanation: '交运按服务端给定的固定北京时间区间展示。',
  } as const;
  const passage = {
    id: 'test-annual-passage',
    work: '素问',
    chapter: '六元正纪大论',
    section: '测试原文定位',
    scope: 'annual-qi',
    quote: '主胜逆，客胜从。',
    explanation: '此处为展示测试的原文片段，不作为完整临床参考。',
    sourceUrl: 'https://example.org/classics',
  };
  return {
    facts,
    ruleVersion: 'YQ-LEARNING-1.0.0',
    annualRelation: { title: '司天与中运', label: '不和', relation: '中运水克司天火', explanation: '用于区分年度关系与当步客主关系。', sourceIds: ['test-source'], sources: [{ id: 'test-source', title: '《传统理论测试来源》', url: 'https://example.org/source' }] },
    currentQi: { title: '当步主客气', label: '相得', relation: '客生主', explanation: '相生关系仅作传统理论解释。', sourceIds: ['test-source'], sources: [{ id: 'test-source', title: '《传统理论测试来源》', url: 'https://example.org/source' }] },
    currentMovement: movement,
    movements: [movement],
    annualPassages: [passage],
    currentPassages: [{ ...passage, id: 'test-current-passage', scope: 'qi-period' }],
    notes: ['规则仍待正式专家冻结。'],
  };
}

export function createBirthComparisonDto(): BirthComparisonDto {
  const learning = createLearningDto();
  return {
    ruleVersion: 'YQ-LEARNING-1.0.0',
    birthPrecision: 'date',
    ambiguous: false,
    message: '出生时刻不详，该日运气结构一致。',
    current: learning,
    candidates: [{ label: '出生运气', from: learning.facts.interval.start, until: learning.facts.interval.end, learning, comparisons: [learning.annualRelation] }],
  };
}

export function createQuestionnaireDto(): ConstitutionQuestionnaireDto {
  return {
    id: 'GBT46939-2025',
    version: 'test-1',
    title: '中医体质分类与判定量表',
    standard: '测试量表（非临床依据）',
    sourceUrl: 'https://example.org/standard',
    sourceNote: '此为展示测试数据，不替代正式标准。',
    instructions: ['回顾规定时间范围内的自身表现。', '每题选择一个最符合的答案。'],
    questions: [
      ...Array.from({ length: 7 }, (_, index) => ({ id: `q${index + 1}`, text: `测试问题 ${index + 1}？`, sex: 'all' as const })),
      { id: 'q8m', text: '男性适用测试问题？', sex: 'male' },
      { id: 'q8f', text: '女性适用测试问题？', sex: 'female' },
    ],
    scales: [{ id: 'balanced', name: '平和质', items: [{ questionId: 'q1', reverse: false }] }],
    options: [
      { value: 1, label: '没有' },
      { value: 2, label: '很少' },
      { value: 3, label: '有时' },
      { value: 4, label: '经常' },
      { value: 5, label: '总是' },
    ],
  };
}

export function createAssessmentDto(): ConstitutionAssessmentDto {
  const names = ['平和质', '气虚质', '阳虚质', '阴虚质', '痰湿质', '湿热质', '血瘀质', '气郁质', '特禀质'];
  return {
    questionnaireId: 'GBT46939-2025',
    version: 'test-1',
    sex: 'male',
    results: names.map((name, index) => ({ id: `type-${index}`, name, itemCount: 3, rawScore: 3, score: index === 0 ? 100 : 0, status: index === 0 ? 'yes' : 'no', label: index === 0 ? '是' : '否' })),
    matchedTypes: ['平和质'],
    tendencyTypes: [],
    summary: '符合平和质判定条件',
    boundaryNote: '量表结果供医生参考，不作为疾病诊断。',
  };
}

export function createClientStub(overrides: Partial<YunQiClient> = {}): YunQiClient {
  return {
    getYear: vi.fn(),
    getCurrent: vi.fn(),
    calculate: vi.fn(),
    getLearningCurrent: vi.fn().mockResolvedValue(createLearningDto()),
    calculateLearning: vi.fn(),
    compareBirth: vi.fn().mockResolvedValue(createBirthComparisonDto()),
    getConstitutionQuestionnaire: vi.fn().mockResolvedValue(createQuestionnaireDto()),
    assessConstitution: vi.fn().mockResolvedValue(createAssessmentDto()),
    ...overrides,
  };
}
