/**
 * 五运六气 MVP 纯规则参考实现。
 * 不包含节气天文算法；调用方必须注入 CalendarProvider。
 * 本文件用于说明规则，不应在未经专家审核与测试的情况下直接用于诊疗。
 */

export const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"] as const;
export const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"] as const;
export type Stem = typeof STEMS[number];
export type Branch = typeof BRANCHES[number];
export type Element = "木"|"火"|"土"|"金"|"水";
export type QiName =
  | "厥阴风木" | "少阴君火" | "太阴湿土"
  | "少阳相火" | "阳明燥金" | "太阳寒水";

export interface CalendarProvider {
  /** 返回指定公历年份、指定节气在 Asia/Shanghai 下对应的绝对时刻。 */
  getSolarTermInstant(year: number, term: "大寒"|"春分"|"小满"|"大暑"|"秋分"|"小雪"): Date;
  readonly name: string;
  readonly version: string;
}

const STEM_RULE: Record<Stem, { element: Element; state: "太过"|"不及"; tone: string }> = {
  甲:{element:"土",state:"太过",tone:"太宫"},
  乙:{element:"金",state:"不及",tone:"少商"},
  丙:{element:"水",state:"太过",tone:"太羽"},
  丁:{element:"木",state:"不及",tone:"少角"},
  戊:{element:"火",state:"太过",tone:"太徵"},
  己:{element:"土",state:"不及",tone:"少宫"},
  庚:{element:"金",state:"太过",tone:"太商"},
  辛:{element:"水",state:"不及",tone:"少羽"},
  壬:{element:"木",state:"太过",tone:"太角"},
  癸:{element:"火",state:"不及",tone:"少徵"},
};

const SITIAN: Record<Branch, [QiName,QiName]> = {
  子:["少阴君火","阳明燥金"], 午:["少阴君火","阳明燥金"],
  丑:["太阴湿土","太阳寒水"], 未:["太阴湿土","太阳寒水"],
  寅:["少阳相火","厥阴风木"], 申:["少阳相火","厥阴风木"],
  卯:["阳明燥金","少阴君火"], 酉:["阳明燥金","少阴君火"],
  辰:["太阳寒水","太阴湿土"], 戌:["太阳寒水","太阴湿土"],
  巳:["厥阴风木","少阳相火"], 亥:["厥阴风木","少阳相火"],
};

const HOST_QI: readonly QiName[] =
  ["厥阴风木","少阴君火","少阳相火","太阴湿土","阳明燥金","太阳寒水"];
const GUEST_ORDER: readonly QiName[] =
  ["厥阴风木","少阴君火","太阴湿土","少阳相火","阳明燥金","太阳寒水"];
const QI_ELEMENT: Record<QiName, Element> = {
  厥阴风木:"木",少阴君火:"火",太阴湿土:"土",
  少阳相火:"火",阳明燥金:"金",太阳寒水:"水"
};
const GENERATES: Record<Element,Element> = {木:"火",火:"土",土:"金",金:"水",水:"木"};
const CONTROLS: Record<Element,Element> = {木:"土",土:"水",水:"火",火:"金",金:"木"};

const mod = (n:number,m:number) => ((n%m)+m)%m;

export function resolveYunQiYear(date: Date, provider: CalendarProvider): number {
  const year = Number(
    new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Shanghai",year:"numeric"}).format(date)
  );
  const daHan = provider.getSolarTermInstant(year,"大寒");
  return date.getTime() >= daHan.getTime() ? year : year - 1;
}

export function ganzhiOfNumericYear(year:number): {stem:Stem;branch:Branch;ganzhi:string} {
  const stem = STEMS[mod(year-4,10)];
  const branch = BRANCHES[mod(year-4,12)];
  return {stem,branch,ganzhi:`${stem}${branch}`};
}

export function guestQiSteps(branch:Branch): QiName[] {
  const [sitian,zaiquan] = SITIAN[branch];
  const s = GUEST_ORDER.indexOf(sitian);
  const result = Array.from({length:6},(_,i)=>GUEST_ORDER[mod(s+i-2,6)]);
  if (result[2] !== sitian || result[5] !== zaiquan) {
    throw new Error("YUNQI_GUEST_QI_INVARIANT_BROKEN");
  }
  return result;
}

export function qiRelation(host:QiName,guest:QiName) {
  const h=QI_ELEMENT[host], g=QI_ELEMENT[guest];
  if (h===g) return {code:"SAME",name:"同气，相得"};
  if (GENERATES[h]===g) return {code:"HOST_GENERATES_GUEST",name:"主生客，相得"};
  if (GENERATES[g]===h) return {code:"GUEST_GENERATES_HOST",name:"客生主，相得"};
  if (CONTROLS[h]===g) return {code:"HOST_CONTROLS_GUEST",name:"主胜客，逆"};
  if (CONTROLS[g]===h) return {code:"GUEST_CONTROLS_HOST",name:"客胜主，从"};
  throw new Error("YUNQI_RELATION_UNRESOLVED");
}

export function calculateYearRules(yunQiYear:number) {
  const {stem,branch,ganzhi}=ganzhiOfNumericYear(yunQiYear);
  const [sitian,zaiquan]=SITIAN[branch];
  const guests=guestQiSteps(branch);
  return {
    yunQiYear,ganzhi,stem,branch,
    suiYun:{...STEM_RULE[stem],label:`${STEM_RULE[stem].element}运${STEM_RULE[stem].state}`},
    sitian,zaiquan,
    steps: HOST_QI.map((hostQi,i)=>({
      index:i+1,
      hostQi,
      guestQi:guests[i],
      relation:qiRelation(hostQi,guests[i]),
    }))
  };
}
