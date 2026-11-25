import './MoreRow.css';

export function MoreRowChevron() {
  return <svg className="current-more__chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m6 4 4 4-4 4" /></svg>;
}

export function MoreRowSummary({ children }: { readonly children: string }) {
  return <summary className="current-more__row">{children}<MoreRowChevron /></summary>;
}
