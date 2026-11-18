import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SegmentedText } from './SegmentedText';

describe('SegmentedText', () => {
  it('groups whole phrases with narrow dot separators and explicit break opportunities', () => {
    const { container } = render(<SegmentedText>丙午 · 五之气 · 客气少阳相火</SegmentedText>);
    expect([...container.querySelectorAll('.ds-seg')].map((segment) => segment.textContent)).toEqual(['丙午', '五之气', '客气少阳相火']);
    expect(container.textContent).toBe('丙午\u202f·\u202f五之气\u202f·\u202f客气少阳相火');
    expect(container.querySelectorAll('wbr')).toHaveLength(2);
  });

  it('keeps a phrase without a separator and book-title punctuation intact', () => {
    const { container } = render(<SegmentedText>《素问·六元正纪大论》</SegmentedText>);
    expect(container.querySelectorAll('.ds-seg')).toHaveLength(1);
    expect(container.textContent).toBe('《素问·六元正纪大论》');
    expect(container.querySelector('wbr')).toBeNull();
  });

  it.each(['  丙午 · 少阳相火  ', '  少阳相火  ', ''])('preserves source edge whitespace for %j', (source) => {
    const { container } = render(<SegmentedText>{source}</SegmentedText>);
    expect(container.textContent).toBe(source.replaceAll(' · ', '\u202f·\u202f'));
    expect([...container.querySelectorAll('.ds-seg')].map((segment) => segment.textContent)).toEqual(source.split(' · '));
  });
});
