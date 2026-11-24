export function RelationReadingSummary(props: { expanded?: boolean; controls?: string; onToggle?: () => void }) {
  const content = <>
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 6c-3-2-6-2.5-9-1.5v14c3-1 6-.5 9 1.5 3-2 6-2.5 9-1.5v-14c-3-1-6-.5-9 1.5zm0 0v14" />
    </svg>
    这些关系怎么读？
    <svg className="relation-reading-summary__chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg>
  </>;
  return props.onToggle
    ? <button type="button" className="relation-reading-summary" aria-expanded={props.expanded}
        aria-controls={props.controls} onClick={props.onToggle}>{content}</button>
    : <summary className="relation-reading-summary">{content}</summary>;
}
