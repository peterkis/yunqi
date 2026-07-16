import type { SolarTerm } from '@yunqi/domain';
import { describe, expect, it } from 'vitest';

import { tyme4tsCalendarProvider } from '../src/index.js';

interface ExpectedSolarTermInstant {
  readonly year: number;
  readonly term: SolarTerm;
  readonly epochMilliseconds: number;
}

const PHASE1_BOUNDARY_INSTANTS = Object.freeze([
  {
    year: 2024,
    term: '大寒',
    epochMilliseconds: 1_705_759_642_000,
  },
  {
    year: 2024,
    term: '春分',
    epochMilliseconds: 1_710_903_985_000,
  },
  {
    year: 2024,
    term: '小满',
    epochMilliseconds: 1_716_209_971_000,
  },
  {
    year: 2024,
    term: '大暑',
    epochMilliseconds: 1_721_634_266_000,
  },
  {
    year: 2024,
    term: '秋分',
    epochMilliseconds: 1_727_009_022_000,
  },
  {
    year: 2024,
    term: '小雪',
    epochMilliseconds: 1_732_218_991_000,
  },
  {
    year: 2025,
    term: '大寒',
    epochMilliseconds: 1_737_316_808_000,
  },
] as const satisfies readonly ExpectedSolarTermInstant[]);

describe('real tyme4ts solar-term boundaries', () => {
  it.each(PHASE1_BOUNDARY_INSTANTS)(
    'preserves the exact $year $term epoch',
    ({ year, term, epochMilliseconds }) => {
      expect(
        tyme4tsCalendarProvider.getSolarTermInstant(year, term),
      ).toEqual({
        epochMilliseconds,
        offset: '+08:00',
      });
    },
  );

  it.each([
    {
      year: 1991,
      term: '小满',
      epochMilliseconds: 674_832_014_000,
    },
    {
      year: 1991,
      term: '大暑',
      epochMilliseconds: 680_256_668_000,
    },
  ] as const satisfies readonly ExpectedSolarTermInstant[])(
    'preserves the historical fixed-Beijing $year $term epoch',
    ({ year, term, epochMilliseconds }) => {
      expect(
        tyme4tsCalendarProvider.getSolarTermInstant(year, term),
      ).toEqual({
        epochMilliseconds,
        offset: '+08:00',
      });
    },
  );
});
