import type { Element, Qi, YunState } from '../types.js';
import { CLASSICAL_SOURCES } from './sources.js';
import type { ClassicalSourceId } from './sources.js';

export type ClassicalPassageMatch =
  | {
      readonly scope: 'annual-movement';
      readonly element: Element;
      readonly state: YunState;
    }
  | { readonly scope: 'annual-qi'; readonly sitian: Qi }
  | {
      readonly scope: 'qi-period';
      readonly sitian: Qi;
      readonly qiPeriod: 1 | 2 | 3 | 4 | 5 | 6;
    };

export interface ClassicalPassage {
  readonly id: string;
  readonly work: string;
  readonly chapter: string;
  readonly section: string;
  readonly scope: ClassicalPassageMatch['scope'];
  readonly quote: string;
  readonly explanation: string;
  readonly sourceUrl: string;
  readonly sourceId: ClassicalSourceId;
  readonly isExcerpt: true;
  readonly interpretationKind: '工程释义';
  readonly match: ClassicalPassageMatch;
}

type ReadingExcerpt = Readonly<{ quote: string; explanation: string }>;
type AnnualMovementRow = ReadingExcerpt &
  Readonly<{ element: Element; state: YunState }>;
type QiPeriodRow = ReadingExcerpt &
  Readonly<{ qiPeriod: 1 | 2 | 3 | 4 | 5 | 6; name: string }>;
type AnnualQiRow = Readonly<{
  sitian: Qi;
  section: string;
  annual: ReadingExcerpt;
  periods: readonly QiPeriodRow[];
}>;

// Each quotation is a contiguous extract from the identified classical passage.
// Incomplete clauses keep their original comma; the UI must label them 摘录.
const annualMovementRows: readonly AnnualMovementRow[] = [
  {
    element: '木',
    state: '太过',
    quote: '岁木太过，风气流行，脾土受邪。',
    explanation: '本段描述木运太过时风气偏盛的传统对应关系，供理解“木—土”生克语境。',
  },
  {
    element: '火',
    state: '太过',
    quote: '岁火太过，炎暑流行，金肺受邪。',
    explanation: '本段描述火运太过与炎暑的传统联系；“金肺受邪”是经典理论用语。',
  },
  {
    element: '土',
    state: '太过',
    quote: '岁土太过，雨湿流行，肾水受邪。',
    explanation: '本段以雨湿解释土运太过，并引出土与水的传统制约关系。',
  },
  {
    element: '金',
    state: '太过',
    quote: '岁金太过，燥气流行，肝木受邪。',
    explanation: '本段以燥气解释金运太过，并引出金与木的传统制约关系。',
  },
  {
    element: '水',
    state: '太过',
    quote: '岁水太过，寒气流行，邪害心火。',
    explanation: '本段以寒气解释水运太过，并引出水与火的传统制约关系。',
  },
  {
    element: '木',
    state: '不及',
    quote: '岁木不及，燥乃大行，生气失应，草木晚荣，',
    explanation: '本段描述木运不及、燥气乘势与草木晚荣，展示“不及”也须观察其他气的作用。',
  },
  {
    element: '火',
    state: '不及',
    quote: '岁火不及，寒迺大行，长政不用，物荣而下凝，',
    explanation: '本段以寒气偏行及生长受抑说明火运不及的传统时令图景。',
  },
  {
    element: '土',
    state: '不及',
    quote: '岁土不及，风迺大行，化气不令，草木茂荣，飘扬而甚，秀而不实，上应岁星。',
    explanation: '本段描述土运不及与风气偏行，区分外观茂盛和结实不足两种物候。',
  },
  {
    element: '金',
    state: '不及',
    quote: '岁金不及，炎火迺行，生气迺用，长气专胜，庶物以茂，燥烁以行，上应荧惑星。',
    explanation: '本段描述金运不及时炎火、生长之气相对显著的传统气化关系。',
  },
  {
    element: '水',
    state: '不及',
    quote: '岁水不及，湿迺大行，长气反用，其化迺速，暑雨数至，上应镇星。',
    explanation: '本段描述水运不及时湿气与暑雨的传统对应；不能据此推断个人疾病。',
  },
];

const annualQiRows: readonly AnnualQiRow[] = [
  {
    sitian: '太阳寒水',
    section: '太阳之政·辰戌之纪',
    annual: {
      quote: '凡此太阳司天之政，气化运行先天，天气肃，地气静，寒凝太虚，阳气不令，水土合德，上应辰星镇星。',
      explanation: '本段总述辰、戌年的太阳司天与太阴在泉。“先天”是时令先后用语，不是出生禀赋。',
    },
    periods: [
      { qiPeriod: 1, name: '初之气', quote: '初之气，地气迁，气迺大温，草迺早荣，民迺厉，温病迺作，身热头痛呕吐，肌腠疮疡。', explanation: '此段为太阳司天的初之气，描述转温、早荣及经典病候，不能移用于其他司天的初之气。' },
      { qiPeriod: 2, name: '二之气', quote: '二之气，大凉反至，民迺惨，草迺遇寒，火气遂抑，民病气郁中满，寒迺始。', explanation: '本段突出本阶段反凉与火气受抑的传统时令描述。' },
      { qiPeriod: 3, name: '三之气', quote: '三之气，天政布，寒气行，雨迺降，', explanation: '本段从司天之气布化说明本阶段寒、雨的传统联系。' },
      { qiPeriod: 4, name: '四之气', quote: '四之气，风湿交争，风化为雨，迺长迺化迺成，', explanation: '本段描述风与湿的交互，以及由此展开的生长、化成图景。' },
      { qiPeriod: 5, name: '五之气', quote: '五之气，阳复化，草迺长，迺化迺成，民迺舒。', explanation: '本段描述阳气再化和草木生长；“民迺舒”是经典概括，不能转为个人健康保证。' },
      { qiPeriod: 6, name: '终之气', quote: '终之气，地气正，湿令行，阴凝太虚，埃置郊野，民迺惨凄，寒风以至，', explanation: '本段突出在泉之气与湿、寒风的传统对应。' },
    ],
  },
  {
    sitian: '阳明燥金',
    section: '阳明之政·卯酉之纪',
    annual: {
      quote: '凡此阳明司天之政，气化运行后天，天气急，地气明，阳专其令，炎暑大行，物燥以坚，淳风迺治，风燥横运，流于气交，多阳少阴，云趋雨府，湿化迺敷。',
      explanation: '本段总述卯、酉年的阳明司天与少阴在泉。“后天”指气化在时序上的表现，不是量表所测体质。',
    },
    periods: [
      { qiPeriod: 1, name: '初之气', quote: '初之气，地气迁，阴始凝，气始肃，水迺冰，寒雨化，', explanation: '本段描述阳明司天初气的阴凝、肃降与寒雨。' },
      { qiPeriod: 2, name: '二之气', quote: '二之气，阳迺布，民迺舒，物迺生荣，', explanation: '本段描述阳气布化和万物生荣；为原文前半段摘录，不代表整段没有其他病候。' },
      { qiPeriod: 3, name: '三之气', quote: '三之气，天政布，凉迺行，燥热交合，燥极而泽，民病寒热。', explanation: '本段描述凉、燥、热交互及燥极而泽，学习时须保留这种变化关系。' },
      { qiPeriod: 4, name: '四之气', quote: '四之气，寒雨降，病暴仆，振栗谵妄，少气嗌干引饮及为心痛痈肿疮疡疟寒之疾，骨痿血便。', explanation: '本段列有寒雨背景下的经典病候，仅供阅读原典，不能据所处日期认定出现这些症状。' },
      { qiPeriod: 5, name: '五之气', quote: '五之气，春令反行，草迺生荣，民气和。', explanation: '本段描述秋季出现类似春令的反常生荣，是传统物候推演。' },
      { qiPeriod: 6, name: '终之气', quote: '终之气，阳气布，候反温，蛰虫来见，流水不冰，民迺康平，其病温。', explanation: '本段把反温、虫现与不冰并列，也保留了原典对温病的叙述。' },
    ],
  },
  {
    sitian: '少阳相火',
    section: '少阳之政·寅申之纪',
    annual: {
      quote: '凡此少阳司天之政，气化运行先天，天气正，地气扰，风迺暴举，木偃沙飞，炎火迺流，阴行阳化，雨迺时应，火木同德，上应荧惑岁星。',
      explanation: '本段总述寅、申年的少阳司天与厥阴在泉。“先天”表示气化时序先于常期。',
    },
    periods: [
      { qiPeriod: 1, name: '初之气', quote: '初之气，地气迁，风胜迺摇，寒迺去，候迺大温，草木早荣。', explanation: '本段描述风胜、转温和早荣，属于少阳司天这一组的初之气。' },
      { qiPeriod: 2, name: '二之气', quote: '二之气，火反郁，白埃四起，云趋雨府，风不胜湿，雨迺零，民迺康。', explanation: '本段突出“火反郁”和风湿关系；这是原典情境，不据此自动生成证候。' },
      { qiPeriod: 3, name: '三之气', quote: '三之气，天政布，炎暑至，少阳临上，雨迺涯。', explanation: '本段突出少阳司天布化、炎暑与雨的传统联系。' },
      { qiPeriod: 4, name: '四之气', quote: '四之气，凉迺至，炎暑间化，白露降，民气和平，其病满身重。', explanation: '本段同时描述转凉和炎暑间化，保留原典对交替变化的表达。' },
      { qiPeriod: 5, name: '五之气', quote: '五之气，阳迺去，寒迺来，雨迺降，气门迺闭，刚木早凋，民避寒邪，君子周密。', explanation: '本段描述寒雨渐来与草木早凋，可用于理解该阶段的传统时令特点。' },
      { qiPeriod: 6, name: '终之气', quote: '终之气，地气正，风迺至，万物反生，霿雾以行。', explanation: '本段描述在泉风气、万物反生与雾的传统联系。' },
    ],
  },
  {
    sitian: '太阴湿土',
    section: '太阴之政·丑未之纪',
    annual: {
      quote: '凡此太阴司天之政，气化运行后天，阴专其政，阳气退辟，大风时起，天气下降，地气上腾，原野昏霿，白埃四起，云奔南极，寒雨数至，物成于差夏。',
      explanation: '本段总述丑、未年的太阴司天与太阳在泉。“后天”是气化时序概念。',
    },
    periods: [
      { qiPeriod: 1, name: '初之气', quote: '初之气，地气迁，寒迺去，春气正，风迺来，生布万物以荣，民气条舒，风湿相薄，雨迺后。', explanation: '本段描述春气、风湿相交与雨时偏后的传统时令图景。' },
      { qiPeriod: 2, name: '二之气', quote: '二之气，大火正，物承化，民迺和，其病温厉大行，远近咸若，湿蒸相薄，雨迺时降。', explanation: '本段并列火气、湿蒸、降雨及经典病候，不能将其中“民迺和”单独作为风险结论。' },
      { qiPeriod: 3, name: '三之气', quote: '三之气，天政布，湿气降，地气腾，雨迺时降，寒迺随之。', explanation: '本段突出太阴司天之湿及寒雨相随的传统联系。' },
      { qiPeriod: 4, name: '四之气', quote: '四之气，畏火临，溽蒸化，地气腾，天气否隔，寒风晓暮，蒸热相薄，草木凝烟，湿化不流，则白露阴布，以成秋令。', explanation: '本段描述相火、湿蒸和早晚寒风并见，不应仅用单一“热”字代替。' },
      { qiPeriod: 5, name: '五之气', quote: '五之气，惨令已行，寒露下，霜迺早降，草木黄落，寒气及体，君子周密，民病皮腠。', explanation: '本段描述寒露、早霜和草木黄落，并附原典病候。' },
      { qiPeriod: 6, name: '终之气', quote: '终之气，寒大举，湿大化，霜迺积，阴迺凝，水坚冰，阳光不治，', explanation: '本段突出太阳在泉阶段寒湿与凝冰的传统图景。' },
    ],
  },
  {
    sitian: '少阴君火',
    section: '少阴之政·子午之纪',
    annual: {
      quote: '凡此少阴司天之政，气化运行先天，地气肃，天气明，寒交暑，热加燥，云驰雨府，湿化迺行，时雨迺降，金火合德，上应荧惑太白。',
      explanation: '本段总述子、午年的少阴司天与阳明在泉。“先天”指气化先于常期，不是先天体质。',
    },
    periods: [
      { qiPeriod: 1, name: '初之气', quote: '初之气，地气迁，燥将去，寒迺始，蛰复藏，水迺冰，霜复降，风迺至，阳气郁，', explanation: '本段描述寒、霜再现及阳气郁的传统初气图景。' },
      { qiPeriod: 2, name: '二之气', quote: '二之气，阳气布，风迺行，春气以正，万物应荣，寒气时至，民迺和，', explanation: '本段描述春气正常展开而间有寒气，并非保证任何个体健康。' },
      { qiPeriod: 3, name: '三之气', quote: '三之气，天政布，大火行，庶类蕃鲜，寒气时至，', explanation: '本段描述少阴司天布化与间有寒气，保留原典中的寒热交替。' },
      { qiPeriod: 4, name: '四之气', quote: '四之气，溽暑至，大雨时行，寒热互至，民病寒热，嗌干黄瘅，鼽衄饮发。', explanation: '本段描述暑湿、大雨及寒热互至；后半部分为经典病候，供医生学习互参。' },
      { qiPeriod: 5, name: '五之气', quote: '五之气，畏火临，暑反至，阳迺化，万物迺生迺长荣，民迺康，其病温。', explanation: '本段对应少阴司天的五之气，说明相火加临、暑气反至；“康”与“病温”均是原典语境。' },
      { qiPeriod: 6, name: '终之气', quote: '终之气，燥令行，馀火内格，肿于上，欬喘甚则血溢，寒气数举，则霿雾翳，', explanation: '本段描述燥令、余火与寒气交互，并列传统病候；不据日期生成个体判断。' },
    ],
  },
  {
    sitian: '厥阴风木',
    section: '厥阴之政·巳亥之纪',
    annual: {
      quote: '凡此厥阴司天之政，气化运行后天，诸同正岁，气化运行同天，天气扰，地气正，风生高远，炎热从之，云趋雨府，湿化迺行，风火同德，上应岁星荧惑。',
      explanation: '本段总述巳、亥年的厥阴司天与少阳在泉，描述风、火、湿的传统联系。',
    },
    periods: [
      { qiPeriod: 1, name: '初之气', quote: '初之气，寒始肃，杀气方至，民病寒于右之下。', explanation: '本段为厥阴司天初气的寒肃描述，“右之下”为原典位置用语。' },
      { qiPeriod: 2, name: '二之气', quote: '二之气，寒不去，华雪水冰，杀气施化霜迺降，名草上焦，寒雨数至，阳复化，民病热于中。', explanation: '本段描述寒气未去与阳气复化并见，保留原典的复合变化。' },
      { qiPeriod: 3, name: '三之气', quote: '三之气，天政布，风迺时举，民病泣出耳鸣掉眩。', explanation: '本段描述厥阴司天风气布化，后半为经典所列病候。' },
      { qiPeriod: 4, name: '四之气', quote: '四之气，溽暑湿热相薄争于左之上，民病黄瘅而为胕肿。', explanation: '本段描述暑湿热相交，位置和病候用语均来自原典，不代表对使用者的辨证。' },
      { qiPeriod: 5, name: '五之气', quote: '五之气，燥湿更胜，沈阴迺布，寒气及体，风雨迺行。', explanation: '本段突出燥湿交替及寒气、风雨的传统联系。' },
      { qiPeriod: 6, name: '终之气', quote: '终之气，畏火司令，阳迺大化，蛰虫出见，流水不冰，地气大发，草迺生，人迺舒，其病温厉，', explanation: '本段描述少阳在泉与反温、生发，并保留了原典的温厉叙述。' },
    ],
  },
];

function createPassage(
  id: string,
  sourceId: ClassicalSourceId,
  section: string,
  match: ClassicalPassageMatch,
  excerpt: ReadingExcerpt,
): ClassicalPassage {
  const source = CLASSICAL_SOURCES[sourceId];

  return Object.freeze({
    id,
    sourceId,
    work: source.work,
    chapter: source.chapter,
    section,
    scope: match.scope,
    quote: excerpt.quote,
    explanation: excerpt.explanation,
    sourceUrl: source.sourceUrl,
    isExcerpt: true,
    interpretationKind: '工程释义',
    match: Object.freeze(match),
  });
}

/**
 * 10 annual movement passages + 6 annual qi passages + 36 qi-period passages.
 * Matching is deliberately based on result fields, never on a Gregorian year
 * or a guest-qi name alone. Interpretation is not a diagnostic rule.
 */
export const CLASSICAL_PASSAGES: readonly ClassicalPassage[] = Object.freeze([
  ...annualMovementRows.map((row) =>
    createPassage(
      `suwen-69-${row.element}-${row.state}`,
      'suwen-69',
      `岁${row.element}${row.state}`,
      { scope: 'annual-movement', element: row.element, state: row.state },
      row,
    ),
  ),
  ...annualQiRows.flatMap((row) => [
    createPassage(
      `suwen-71-${row.sitian}-annual`,
      'suwen-71',
      row.section,
      { scope: 'annual-qi', sitian: row.sitian },
      row.annual,
    ),
    ...row.periods.map((period) =>
      createPassage(
        `suwen-71-${row.sitian}-${period.qiPeriod}`,
        'suwen-71',
        `${row.section}·${period.name}`,
        { scope: 'qi-period', sitian: row.sitian, qiPeriod: period.qiPeriod },
        period,
      ),
    ),
  ]),
]);
