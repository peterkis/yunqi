import type { ClassicalPassageViewModel } from './map-learning';

export interface ClassicsCardViewModel {
  readonly heading: string;
  readonly badge: string;
  readonly isCurrent: boolean;
  readonly quote: string;
  readonly fullQuote: string | undefined;
  readonly interpretation: string;
  readonly sourceTitle: string;
  readonly sourceSection: string;
  readonly sourceUrl: string;
}

export function mapClassicsCard(passage: ClassicalPassageViewModel, isCurrent: boolean): ClassicsCardViewModel {
  return {
    heading: passage.section, badge: isCurrent ? '正在此段' : '全年适用', isCurrent,
    quote: passage.previewQuote, fullQuote: passage.fullQuote, interpretation: passage.explanation,
    sourceTitle: `《${passage.work}·${passage.chapter}》`,
    sourceSection: `${passage.section}（摘录）`, sourceUrl: passage.sourceUrl,
  };
}
