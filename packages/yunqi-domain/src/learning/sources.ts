/**
 * Public-domain classical text witnesses used by the learning excerpts.
 * These are traceable digital transcriptions, not an expert-approved edition.
 * Quotations and the project's reading notes are deliberately separate.
 */
export const CLASSICAL_READING_VERSION = 'YQ-CLASSICAL-READING-1.0.0' as const;

export const CLASSICAL_READING_STATUS = '摘录已核对电子文本，待中医专家审校' as const;

export interface ClassicalSource {
  readonly id: string;
  readonly work: string;
  readonly chapter: string;
  readonly sourceUrl: string;
  readonly witness: string;
  readonly checkedOn: string;
  readonly note: string;
}

export const CLASSICAL_SOURCES = Object.freeze({
  'suwen-69': Object.freeze({
    id: 'suwen-69',
    work: '黄帝内经·素问',
    chapter: '气交变大论篇第六十九',
    sourceUrl:
      'https://zh.wikisource.org/zh-hans/黃帝內經/素問第二十卷',
    witness: '维基文库《黄帝内经／素问第二十卷》简体电子文本',
    checkedOn: '2026-11-16',
    note:
      '所录为原典选段，保留迺、欬等字形；标点沿用电子文本。病候属于经典论述，不作为个体诊断或疾病预测。工程释义不是原文译本。',
  }),
  'suwen-71': Object.freeze({
    id: 'suwen-71',
    work: '黄帝内经·素问',
    chapter: '六元正纪大论篇第七十一',
    sourceUrl:
      'https://zh.wikisource.org/zh-hans/黃帝內經/素問第二十一卷',
    witness: '维基文库《黄帝内经／素问第二十一卷》简体电子文本',
    checkedOn: '2026-11-16',
    note:
      '依“凡此某司天之政”定位年度段，并依该段内的初至终之气定位阶段段。原文的“先天／后天”指气化先后时序，不是出生体质。选段不含治法、方药或剂量。',
  }),
  'yizong-jinjian-yunqi': Object.freeze({
    id: 'yizong-jinjian-yunqi',
    work: '医宗金鉴',
    chapter: '运气要诀·运气分主节令歌',
    sourceUrl: 'https://ctext.org/wiki.pl?chapter=197638&if=gb&remap=gb',
    witness: '中国哲学书电子化计划《运气要诀》，运气分主节令歌及注',
    checkedOn: '2026-11-16',
    note:
      '口诀提供大寒起运及春分、芒种、处暑、立冬的日数定位；未规定现代天文交节秒数加整日的算法。使用该算法时须另标工程口径，不能声称复原古代交司时刻。',
  }),
  'leijing-tuyi-2': Object.freeze({
    id: 'leijing-tuyi-2',
    work: '类经图翼',
    chapter: '卷二·五运主运图说、五音五运太少相生解',
    sourceUrl:
      'https://wk.100ke.info/zh-hans/類經_(四庫全書本)/圖翼卷02',
    witness: '《类经》四库全书本图翼卷二电子文本',
    checkedOn: '2026-11-16',
    note:
      '七十三日零五刻基于一年三百六十五日二十五刻、每日百刻，五刻为72分钟。古四年交司时刻、现代节气偏移及实际大寒年五等分不是等价方法。客运太少还须以本次选定的《素问》年度序列为准。',
  }),
  'yizongjinjian-35': Object.freeze({
    id: 'yizongjinjian-35',
    work: '医宗金鉴',
    chapter: '卷三十五·六十年运气上下相临歌',
    sourceUrl: 'https://ctext.org/wiki.pl?chapter=387138&if=gb&remap=gb',
    witness: '中国哲学书电子化计划《御纂医宗金鉴》卷三十五，上下相临歌及注',
    checkedOn: '2026-11-16',
    note:
      '“气生中运曰顺化，运被气克天刑言。运生天气乃小逆，运克司天不和愆。气运相同天符岁。”本组名称只比较司天与中运，不用于在泉或当步客主气，也不评价个人病情。',
  }),
  'suwen-zhizhen': Object.freeze({
    id: 'suwen-zhizhen',
    work: '黄帝内经·素问',
    chapter: '至真要大论篇第七十四·客主逆从',
    sourceUrl: 'https://ctext.org/wiki.pl?chapter=966437&if=gb&remap=gb',
    witness: '中国哲学书电子化计划《黄帝内经素问补注释文》卷四十八，至真要大论篇下',
    checkedOn: '2026-11-16',
    note:
      '“主胜逆，客胜从，天之道也。”用于解释当步客主相克的方向，不能将顺从解释为相生或健康保证。',
  }),
  'suwen-liuwei': Object.freeze({
    id: 'suwen-liuwei',
    work: '黄帝内经·素问',
    chapter: '六微旨大论篇第六十八·君相二火',
    sourceUrl: 'https://ctext.org/huangdi-neijing/liu-wei-zhi-da-lun',
    witness: '中国哲学书电子化计划《黄帝内经·素问》六微旨大论',
    checkedOn: '2026-11-16',
    note:
      '“君位臣则顺，臣位君则逆。”客少阴君火加临主少阳相火为顺，反向为逆；两者虽同属火，仍必须保留不同的六气名称。',
  }),
  'five-elements': Object.freeze({
    id: 'five-elements',
    work: '医宗金鉴',
    chapter: '运气要诀·五行质气生克制化歌',
    sourceUrl: 'https://ctext.org/wiki.pl?chapter=197638&if=gb&remap=gb',
    witness: '中国哲学书电子化计划《运气要诀》五行质气生克制化歌及注',
    checkedOn: '2026-11-16',
    note:
      '注文明列木生火、火生土、土生金、金生水、水生木及木克土、土克水、水克火、火克金、金克木。这里只引作五行方向依据，不据此增加出生疾病或体质判定规则。',
  }),
} satisfies Readonly<Record<string, ClassicalSource>>);

export type ClassicalSourceId = keyof typeof CLASSICAL_SOURCES;

export interface ClassicalRuleReference {
  readonly id: string;
  readonly sourceId: ClassicalSourceId;
  readonly section: string;
  readonly quote: string;
  readonly engineeringNote: string;
}

/** Textual support and explicit limits for the separately versioned rules. */
export const FIVE_MOVEMENT_REFERENCES: readonly ClassicalRuleReference[] =
  Object.freeze([
    Object.freeze({
      id: 'five-movement-term-mnemonic',
      sourceId: 'yizong-jinjian-yunqi',
      section: '运气分主节令歌',
      quote: '初大二春十三日，三运芒种十日甫，四运处暑后七日，五运立冬四日主。',
      engineeringNote:
        '工程教学口径若采用实际交节时刻加整日，则依次为大寒、春分+13日、芒种+10日、处暑+7日、立冬+4日、次年大寒。加日须统一解释为固定北京时间下的24小时，不含起日计数。这是现代工程解释，并非古交司时刻的逐秒复原。',
    }),
    Object.freeze({
      id: 'five-movement-classical-duration',
      sourceId: 'leijing-tuyi-2',
      section: '五运主运图说',
      quote: '每岁三百六十五日二十五刻以五分分之则每运得七十三日零五刻',
      engineeringNote:
        '原文采用365.25日的年长及百刻制，故一运为73.05日。该固定长度既不等同于现代不等长节气加口诀日数，也不等同于实际大寒年区间五等分；实现只能声明并采用一个边界口径。',
    }),
    Object.freeze({
      id: 'five-movement-host-tone-groups',
      sourceId: 'leijing-tuyi-2',
      section: '五音五运太少相生解',
      quote: '凡甲乙丙壬癸五年皆以太角为初戊己庚辛丁五年皆以少角为初者所以纪主运也',
      engineeringNote:
        '主运木、火、土、金、水从该初音依次太少相生。客运另按本年中运起始，采用《素问》各年明列的五音次序；不能跨羽到角时一律翻转太少。',
    }),
    Object.freeze({
      id: 'five-movement-bing-water-to-wood',
      sourceId: 'suwen-71',
      section: '少阴之政·子午之纪·丙子丙午',
      quote: '太羽太角少征太宫少商',
      engineeringNote:
        '丙年客运从太羽起，继为太角、少徵、太宫、少商。这一原文例证要求水到木处保留太音，不能实现为每一步都翻转太少。“征”在展示五音时按本项目术语写作“徵”。',
    }),
  ]);
