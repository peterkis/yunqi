import { Fragment } from 'react';

/** Keep display phrases together; book-title dots and source text stay intact. */
export function SegmentedText({ children }: { readonly children: string }) {
  return <span className="ds-segmented-text">{children.split(' · ').map((segment, index) => <Fragment key={index}>
    {index > 0 ? <>{'\u202f·\u202f'}<wbr /></> : null}
    <span className="ds-seg"><span className="ds-seg__text">{segment}</span></span>
  </Fragment>)}</span>;
}
