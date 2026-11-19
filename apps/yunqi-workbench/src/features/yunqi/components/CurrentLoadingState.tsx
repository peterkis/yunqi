/** Static, silent reservation from the first commit; no shimmer or fake data. */
export function CurrentLoadingState({ message }: { readonly message?: string | undefined }) {
  return <div className="current-overview current-loading">
    {message && <span className="visually-hidden" role="status">{message}</span>}
    <div className="current-overview__annual" aria-hidden="true">
      <div className="ds-info-card">
        <div className="current-loading__line" />
        <div className="ds-info-card__content">
          <div className="current-year-wheel current-loading__block" />
          <div className="current-loading__line current-loading__legend" />
          <div className="current-loading__facts">{[0, 1, 2].map(index => <div className="current-loading__block" key={index} />)}</div>
        </div>
        <div className="current-loading__line current-loading__hint" />
      </div>
    </div>
    <div className="current-loading__period ds-info-card ds-info-card--compact" aria-hidden="true">
      <div className="current-loading__facts">{[0, 1].map(index => <div className="current-loading__block" key={index} />)}</div>
    </div>
  </div>;
}
