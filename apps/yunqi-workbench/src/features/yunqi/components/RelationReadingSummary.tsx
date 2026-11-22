export function RelationReadingSummary() {
  return (
    <summary className="relation-reading-summary">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 6c-3-2-6-2.5-9-1.5v14c3-1 6-.5 9 1.5 3-2 6-2.5 9-1.5v-14c-3-1-6-.5-9 1.5zm0 0v14" />
      </svg>
      这些关系怎么读？
      <svg className="relation-reading-summary__chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg>
    </summary>
  );
}
