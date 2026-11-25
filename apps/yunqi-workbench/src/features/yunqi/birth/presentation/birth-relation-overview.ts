import type { LearningRelationViewModel } from '../../presentation/map-learning';
import type { BirthRowViewModel } from './map-birth-view';

// Presentation of the service's five birth/current labels; never infer a relation from the elements.
const directions = new Map<string, readonly [group: '相克' | '相生' | '同五行', direction: string]>([
  ['当前克出生', ['相克', '当前 → 出生']], ['出生克当前', ['相克', '出生 → 当前']],
  ['当前生出生', ['相生', '当前 → 出生']], ['出生生当前', ['相生', '出生 → 当前']],
  ['同五行', ['同五行', '无方向']],
]);

export function birthRelationOverview(rows: readonly BirthRowViewModel[]) {
  const counts = { 相克: 0, 相生: 0, 同五行: 0 };
  const explanations = new Map<string, string[]>();
  const sources = new Map<string, LearningRelationViewModel['sources'][number]>();
  const entries = rows.map(({ label, relation }) => {
    const meaning = relation && directions.get(relation.label);
    if (meaning) counts[meaning[0]]++;
    if (relation?.explanation) {
      const dimensions = explanations.get(relation.explanation) ?? [];
      dimensions.push(label);
      explanations.set(relation.explanation, dimensions);
    }
    for (const source of relation?.sources ?? []) sources.set(source.id, source);
    return {
      dimension: label, direction: meaning?.[1] ?? '—', label: relation?.label ?? '暂无说明',
      tone: relation?.label === '当前克出生' ? 'incoming-control' : relation?.tone ?? 'neutral',
    };
  });
  return { entries, counts, explanations, sources: [...sources.values()] };
}
