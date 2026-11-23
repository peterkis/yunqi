import { compactSourceTitle, type LearningRelationViewModel } from '../presentation/map-learning';

export function RelationSourceLinks({ sources, pills = false }: {
  readonly sources: LearningRelationViewModel['sources'];
  readonly pills?: boolean;
}) {
  if (!sources.length) return null;
  return <div className={pills ? 'learning-sources learning-sources--pills' : 'learning-sources'}>
    {sources.map((source) => {
      if (pills) return <span className="learning-source" key={source.id} title={source.title}>{compactSourceTitle(source.title)}</span>;
      return <a className="learning-source" key={source.id} href={source.url}
        target="_blank" rel="noreferrer"
        aria-label={`${source.title}，新窗口打开`}>
        <span>{source.title}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M6 3H3v10h10v-3M9 3h4v4M7 9l6-6" />
        </svg>
      </a>;
    })}
  </div>;
}
