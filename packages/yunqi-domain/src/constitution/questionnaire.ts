import type {
  ConstitutionQuestion,
  ConstitutionQuestionnaire,
  ConstitutionScale,
} from './types.js';

export const CONSTITUTION_QUESTIONNAIRE_ID = 'GBT46939-2025';
export const CONSTITUTION_RULE_VERSION = 'YQ-CONSTITUTION-1.0.0';

// GB/T 46939-2025, Appendix A, printed pages 7-9. Identical questions
// share one answer; each scale retains its own direction and denominator.
const questions: readonly ConstitutionQuestion[] = Object.freeze([
  { id: 'energy', text: '您精力充沛吗？', sex: 'all' },
  { id: 'fatigue', text: '您容易疲乏吗？', sex: 'all' },
  { id: 'low_mood', text: '您感到闷闷不乐、情绪低沉吗？', sex: 'all' },
  { id: 'cold_intolerance', text: '您比一般人耐受不了寒冷（冬天的寒冷，夏天的冷空调、电扇等）吗？', sex: 'all' },
  { id: 'short_breath', text: '您容易气短（呼吸短促，接不上气）吗？', sex: 'all' },
  { id: 'palpitations', text: '您容易心慌吗？', sex: 'all' },
  { id: 'cold_body', text: '您胃脘部、背部或腰膝部怕冷吗？', sex: 'all' },
  { id: 'extra_clothes', text: '您感到怕冷、衣服比别人穿得多吗？', sex: 'all' },
  { id: 'body_heat', text: '您感觉身体、脸上发热吗？', sex: 'all' },
  { id: 'dry_skin_lips', text: '您皮肤或口唇干吗？', sex: 'all' },
  { id: 'flushed_cheeks', text: '您面部两颧潮红或偏红吗？', sex: 'all' },
  { id: 'body_heaviness', text: '您感到身体沉重不轻松或不爽快吗？', sex: 'all' },
  { id: 'soft_abdomen', text: '您腹部肥满松软吗？', sex: 'all' },
  { id: 'sticky_mouth', text: '您嘴里有黏黏的感觉吗？', sex: 'all' },
  { id: 'oily_face', text: '您面部或鼻部有油腻感或者油亮发光吗？', sex: 'all' },
  { id: 'dark_urine', text: '您小便时尿道有发热感、尿色浓（深）吗？', sex: 'all' },
  { id: 'yellow_discharge', text: '您带下色黄（白带颜色发黄）吗？（限女性回答）', sex: 'female' },
  { id: 'damp_scrotum', text: '您的阴囊部位潮湿吗？（限男性回答）', sex: 'male' },
  { id: 'body_pain', text: '您身体上有哪里疼痛吗？', sex: 'all' },
  { id: 'dark_complexion', text: '您面色晦暗或容易出现褐斑吗？', sex: 'all' },
  { id: 'dark_lips', text: '您口唇颜色偏暗吗？', sex: 'all' },
  { id: 'anxiety', text: '您容易精神紧张、焦虑不安吗？', sex: 'all' },
  { id: 'emotional_sensitivity', text: '您多愁善感、感情脆弱吗？', sex: 'all' },
  { id: 'sneezing', text: '您没有感冒时也会打喷嚏吗？', sex: 'all' },
  { id: 'allergy', text: '您容易过敏（对药物、食物、气味、花粉或在季节交替、气候变化时）吗？', sex: 'all' },
  { id: 'urticaria', text: '您的皮肤容易起荨麻疹（风团、风疹块、风疙瘩）吗？', sex: 'all' },
  { id: 'scratch_marks', text: '您的皮肤一抓就红，并出现抓痕吗？', sex: 'all' },
].map((question) => Object.freeze(question as ConstitutionQuestion)));

function scale(
  id: ConstitutionScale['id'],
  name: string,
  questionIds: readonly string[],
  reverseIds: readonly string[] = [],
): ConstitutionScale {
  return Object.freeze({
    id,
    name,
    items: Object.freeze(questionIds.map((questionId) => Object.freeze({
      questionId,
      reverse: reverseIds.includes(questionId),
    }))),
  });
}

const scales: readonly ConstitutionScale[] = Object.freeze([
  scale('balanced', '平和质', ['energy', 'fatigue', 'low_mood', 'cold_intolerance'], ['fatigue', 'low_mood', 'cold_intolerance']),
  scale('qi_deficiency', '气虚质', ['fatigue', 'short_breath', 'palpitations']),
  scale('yang_deficiency', '阳虚质', ['cold_body', 'extra_clothes', 'cold_intolerance']),
  scale('yin_deficiency', '阴虚质', ['body_heat', 'dry_skin_lips', 'flushed_cheeks']),
  scale('phlegm_dampness', '痰湿质', ['body_heaviness', 'soft_abdomen', 'sticky_mouth']),
  scale('damp_heat', '湿热质', ['oily_face', 'dark_urine', 'yellow_discharge', 'damp_scrotum']),
  scale('blood_stasis', '血瘀质', ['body_pain', 'dark_complexion', 'dark_lips']),
  scale('qi_stagnation', '气郁质', ['low_mood', 'anxiety', 'emotional_sensitivity']),
  scale('special_diathesis', '特禀质', ['sneezing', 'allergy', 'urticaria', 'scratch_marks']),
]);

const questionnaire: ConstitutionQuestionnaire = Object.freeze({
  id: CONSTITUTION_QUESTIONNAIRE_ID,
  version: CONSTITUTION_RULE_VERSION,
  title: '中医体质分类与判定量表',
  standard: 'GB/T 46939-2025',
  sourceUrl: 'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=827D6D266BA52A2983F93638DA871028',
  sourceNote: '采用2025版国家标准第5章及附录A（2026年4月1日实施）。请按近一年的通常感受作答，测评结果供体质辨识参考。',
  instructions: '请根据近一年的体验和感觉逐题回答。相同问题只回答一次；按量表适用项选择男或女后，需完成26题。答案仅用于本次计分，不保存患者档案。',
  questions,
  scales,
  options: Object.freeze([
    { value: 1, label: '没有（根本不）' },
    { value: 2, label: '很少（有一点）' },
    { value: 3, label: '有时（有些）' },
    { value: 4, label: '经常（相当）' },
    { value: 5, label: '总是（非常）' },
  ].map((option) => Object.freeze(option))),
});

export function getConstitutionQuestionnaire(): ConstitutionQuestionnaire {
  return questionnaire;
}
