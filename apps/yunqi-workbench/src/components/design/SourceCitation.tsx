import type { ReactNode } from 'react';

export function SourceCitation({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return <span className="learning-source" title={title}>{children}</span>;
}
