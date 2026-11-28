import { SourceCitation } from '../../../components/design/SourceCitation';
import { compactSourceTitle, type LearningRelationViewModel } from '../presentation/map-learning';

export function RelationSources({ sources }: {
  readonly sources: LearningRelationViewModel['sources'];
}) {
  if (!sources.length) return null;
  return <div className="learning-sources learning-sources--pills">
    {sources.map(source =>
      <SourceCitation key={source.id} title={source.title}>{compactSourceTitle(source.title)}</SourceCitation>
    )}
  </div>;
}
