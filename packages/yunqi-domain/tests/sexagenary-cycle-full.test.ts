import { describe, expect, it } from 'vitest';

import { calculateYearYunQi } from '../src/index.js';
import type {
  EarthlyBranch,
  HeavenlyStem,
  Qi,
  SitianZaiquan,
  SuiYun,
} from '../src/index.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

// Independent acceptance oracle copied from the frozen Phase 1 rule matrix.
// Nothing in this file is generated from production constants.
const EXPECTED_SIXTY_CYCLE = Object.freeze([
  '甲子',
  '乙丑',
  '丙寅',
  '丁卯',
  '戊辰',
  '己巳',
  '庚午',
  '辛未',
  '壬申',
  '癸酉',
  '甲戌',
  '乙亥',
  '丙子',
  '丁丑',
  '戊寅',
  '己卯',
  '庚辰',
  '辛巳',
  '壬午',
  '癸未',
  '甲申',
  '乙酉',
  '丙戌',
  '丁亥',
  '戊子',
  '己丑',
  '庚寅',
  '辛卯',
  '壬辰',
  '癸巳',
  '甲午',
  '乙未',
  '丙申',
  '丁酉',
  '戊戌',
  '己亥',
  '庚子',
  '辛丑',
  '壬寅',
  '癸卯',
  '甲辰',
  '乙巳',
  '丙午',
  '丁未',
  '戊申',
  '己酉',
  '庚戌',
  '辛亥',
  '壬子',
  '癸丑',
  '甲寅',
  '乙卯',
  '丙辰',
  '丁巳',
  '戊午',
  '己未',
  '庚申',
  '辛酉',
  '壬戌',
  '癸亥',
] as const);

const EXPECTED_SUI_YUN = Object.freeze({
  甲: Object.freeze({ element: '土', state: '太过', tone: '太宫' }),
  乙: Object.freeze({ element: '金', state: '不及', tone: '少商' }),
  丙: Object.freeze({ element: '水', state: '太过', tone: '太羽' }),
  丁: Object.freeze({ element: '木', state: '不及', tone: '少角' }),
  戊: Object.freeze({ element: '火', state: '太过', tone: '太徵' }),
  己: Object.freeze({ element: '土', state: '不及', tone: '少宫' }),
  庚: Object.freeze({ element: '金', state: '太过', tone: '太商' }),
  辛: Object.freeze({ element: '水', state: '不及', tone: '少羽' }),
  壬: Object.freeze({ element: '木', state: '太过', tone: '太角' }),
  癸: Object.freeze({ element: '火', state: '不及', tone: '少徵' }),
} satisfies Readonly<Record<HeavenlyStem, SuiYun>>);

const EXPECTED_SITIAN_ZAIQUAN = Object.freeze({
  子: Object.freeze({ sitian: '少阴君火', zaiquan: '阳明燥金' }),
  丑: Object.freeze({ sitian: '太阴湿土', zaiquan: '太阳寒水' }),
  寅: Object.freeze({ sitian: '少阳相火', zaiquan: '厥阴风木' }),
  卯: Object.freeze({ sitian: '阳明燥金', zaiquan: '少阴君火' }),
  辰: Object.freeze({ sitian: '太阳寒水', zaiquan: '太阴湿土' }),
  巳: Object.freeze({ sitian: '厥阴风木', zaiquan: '少阳相火' }),
  午: Object.freeze({ sitian: '少阴君火', zaiquan: '阳明燥金' }),
  未: Object.freeze({ sitian: '太阴湿土', zaiquan: '太阳寒水' }),
  申: Object.freeze({ sitian: '少阳相火', zaiquan: '厥阴风木' }),
  酉: Object.freeze({ sitian: '阳明燥金', zaiquan: '少阴君火' }),
  戌: Object.freeze({ sitian: '太阳寒水', zaiquan: '太阴湿土' }),
  亥: Object.freeze({ sitian: '厥阴风木', zaiquan: '少阳相火' }),
} satisfies Readonly<Record<EarthlyBranch, SitianZaiquan>>);

describe('complete independent sexagenary-cycle oracle', () => {
  it('verifies every year in the 60-year cycle from the 1984 甲子 anchor', () => {
    expect(EXPECTED_SIXTY_CYCLE).toHaveLength(60);

    EXPECTED_SIXTY_CYCLE.forEach((expectedGanzhi, offset) => {
      const year = 1984 + offset;
      const expectedStem = expectedGanzhi[0] as HeavenlyStem;
      const expectedBranch = expectedGanzhi[1] as EarthlyBranch;
      const expectedQi: Readonly<SitianZaiquan> =
        EXPECTED_SITIAN_ZAIQUAN[expectedBranch];
      const result = calculateYearYunQi(year, fixedCalendarProvider);

      expect(
        {
          ganzhi: result.ganzhi,
          stem: result.stem,
          branch: result.branch,
          suiYun: result.suiYun,
          sitian: result.sitian,
          zaiquan: result.zaiquan,
        },
        `independent oracle mismatch for ${year}`,
      ).toEqual({
        ganzhi: expectedGanzhi,
        stem: expectedStem,
        branch: expectedBranch,
        suiYun: EXPECTED_SUI_YUN[expectedStem],
        sitian: expectedQi.sitian as Qi,
        zaiquan: expectedQi.zaiquan as Qi,
      });
    });
  });
});
