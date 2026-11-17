import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { InlineText } from './InlineText';
import { RelationChip } from './RelationChip';

it('uses narrow separators without changing book-title punctuation or numbers', () => {
  const source = '《素问·六元正纪大论》 · 2024-01-20 · 4/26';
  render(<p><InlineText>{source}</InlineText></p>);
  const text = screen.getByText(source);
  expect(text.textContent).toBe('《素问·六元正纪大论》\u202f·\u202f2024-01-20\u202f·\u202f4/26');
});

it('retains API relationship wording and tone while narrowing its display separator', () => {
  render(<RelationChip tone="favorable" label="顺 · 客胜主" explanation="客气胜于主气。" />);
  const label = screen.getByText('顺 · 客胜主');
  expect(label).toHaveClass('ds-relation__chip--favorable');
  expect(label.textContent).toBe('顺\u202f·\u202f客胜主');
  expect(screen.getByText('客气胜于主气。')).toBeVisible();
});
