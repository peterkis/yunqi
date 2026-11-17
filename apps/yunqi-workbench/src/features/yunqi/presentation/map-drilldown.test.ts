import { describe, expect, it } from 'vitest';
import { createYunQiYearDto } from '../../../test/yunqi-fixtures';
import { mapAnnualYunQi } from './map-annual-yunqi';
import { mapDrilldownStage, mapDrilldownSummary } from './map-drilldown';

describe('drilldown presentation', () => {
  it('adds drilldown metadata while preserving summary facts and API boundaries', () => {
    const model = mapAnnualYunQi(createYunQiYearDto());
    const display = mapDrilldownSummary(model.summary);
    expect(display).toMatchObject(model.summary);
    expect(display.interval).toBe(model.summary.interval);
    expect(display.boundaryMeta).toBe('交运 01-20 09:00');
  });

  it('styles API directions and preserves separate traditional descriptions without computing relations', () => {
    const model = mapAnnualYunQi(createYunQiYearDto());
    const third = mapDrilldownStage(model.stages[2]);
    expect(third.relation.direction.label).toBe('客生主');
    expect(third.relation.traditionalLabel).toBe('客生主，相得');
    expect(third.relationExplanation).toBe('客气生主气；主气为少阳相火，客气为少阳相火。');
    expect(third.start).toBe(model.stages[2].start);
    expect(third.end).toBe(model.stages[2].end);
    expect(third).not.toHaveProperty('status');
  });
});
