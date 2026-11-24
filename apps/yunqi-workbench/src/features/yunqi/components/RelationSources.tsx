import { compactSourceTitle, type LearningRelationViewModel } from '../presentation/map-learning';

export function RelationSources({ sources }: {
  readonly sources: LearningRelationViewModel['sources'];
}) {
  if (!sources.length) return null;
  return <div className="learning-sources learning-sources--pills">
    {sources.map(source =>
      <span className="learning-source" key={source.id} title={source.title}>{compactSourceTitle(source.title)}</span>
    )}
  </div>;
}
