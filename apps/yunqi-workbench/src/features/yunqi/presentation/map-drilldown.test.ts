import { describe, expect, it } from 'vitest';
import { createYunQiYearDto } from '../../../test/yunqi-fixtures';
import { mapAnnualYunQi } from './map-annual-yunqi';
import { mapDrilldownStage, mapDrilldownSummary } from './map-drilldown';

describe('drilldown presentation', () => {
  it('projects every API qi and movement element to a small labeled dot', () => {
    const model = mapAnnualYunQi(createYunQiYearDto());
    expect(model.stages.map((stage) => mapDrilldownStage(stage).hostElement))
      .toEqual(['wood', 'fire', 'fire', 'earth', 'metal', 'water']);
    expect(model.stages.map((stage) => mapDrilldownStage(stage).guestElement))
      .toEqual(['fire', 'earth', 'fire', 'metal', 'water', 'wood']);
    for (const [element, expected] of [['木', 'wood'], ['火', 'fire'], ['土', 'earth'], ['金', 'metal'], ['水', 'water']] as const) {
      const summary = { ...model.summary, suiYun: { ...model.summary.suiYun, element } };
      const display = mapDrilldownSummary(summary);
      expect(display.movementElement).toBe(expected);
      expect(display.sitianElement).toBe('fire');
      expect(display.zaiquanElement).toBe('wood');
      expect(display.interval).toBe(summary.interval);
      expect(display.boundaryMeta).toBe('交运 01-20 09:00');
    }
  });

  it('styles API directions and preserves separate traditional descriptions without computing relations', () => {
    const model = mapAnnualYunQi(createYunQiYearDto());
    expect(model.stages.map((stage) => mapDrilldownStage(stage).relationTone))
      .toEqual(['neutral', 'favorable', 'favorable', 'adverse', 'adverse', 'neutral']);
    const third = mapDrilldownStage(model.stages[2]);
    expect(third.relation.direction.label).toBe('客生主');
    expect(third.relation.traditionalLabel).toBe('客生主，相得');
    expect(third.relationExplanation).toBe('客气生主气；主气为少阳相火，客气为少阳相火。');
    expect(third.start).toBe(model.stages[2].start);
    expect(third.end).toBe(model.stages[2].end);
    expect(third).not.toHaveProperty('status');
  });

  it('uses a neutral display for an unknown future API direction', () => {
    const stage = mapAnnualYunQi(createYunQiYearDto()).stages[0];
    Reflect.set(stage.relation.direction, 'code', 'FUTURE_DIRECTION');
    const display = mapDrilldownStage(stage);
    expect(display.relationTone).toBe('neutral');
    expect(display.relationExplanation).toContain('同五行');
  });
});
