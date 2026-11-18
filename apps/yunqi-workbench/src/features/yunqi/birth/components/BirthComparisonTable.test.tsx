import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createBirthComparisonDto } from '../../../../test/learning-fixtures';
import { mapBirthView } from '../presentation/map-birth-view';
import { BirthComparisonTable } from './BirthComparisonTable';

describe('BirthComparisonTable mirror semantics', () => {
  it('associates all five dimensions with three column headers and names each row in reading order', () => {
    const view = mapBirthView(createBirthComparisonDto());
    const candidate = view.candidates[0];
    const rows = candidate.rows.map((row, index) => ({ ...row, relation: {
      title: row.label, label: `关系${index}`, tone: 'neutral' as const,
      relation: `说明${index}`, explanation: '接口释义', sources: [],
    } }));
    render(<BirthComparisonTable candidate={{ ...candidate, rows }} current={view} />);
    const table = screen.getByRole('table');
    const columns = within(table).getAllByRole('columnheader');
    expect(columns).toHaveLength(3);
    expect(columns[0]).toHaveTextContent(`先天${candidate.birthGanzhi}`);
    expect(columns[1]).toHaveTextContent('关系');
    expect(columns[2]).toHaveTextContent(`当下${view.currentGanzhi}`);
    for (const column of columns) expect(column).toHaveAttribute('scope', 'col');
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    for (const [index, value] of rows.entries()) {
      const heading = within(table).getByRole('rowheader', { name: value.label });
      expect(heading).toHaveAttribute('scope', 'row');
      expect(heading).toHaveAttribute('headers', columns[1].id);
      const row = heading.closest('tr')!;
      const cells = within(row).getAllByRole('cell');
      expect(cells).toHaveLength(2);
      expect(row.children[1]).toBe(heading);
      expect(cells[0]).toHaveAttribute('headers', `${heading.id} ${columns[0].id}`);
      expect(cells[1]).toHaveAttribute('headers', `${heading.id} ${columns[2].id}`);
      const parts = [value.label, value.birth.label, ...value.birth.detail, `关系${index} 说明${index}`, value.current.label, ...value.current.detail];
      // Accessible row naming must precede the first value with the dimension,
      // then place the relation (including its hidden explanation) before current.
      expect(row).toHaveAccessibleName(parts.join(' ').replace(/\s+/g, ' ').trim());
      expect(within(row).getByText(`说明${index}`)).toHaveClass('visually-hidden');
    }
    expect(table.querySelectorAll('.ds-element__dot')).toHaveLength(10);
    expect(table.querySelector('thead time')).toBeNull();
  });

  it('keeps empty detail space and explicit missing relations without inventing an element', () => {
    const view = mapBirthView(createBirthComparisonDto());
    const candidate = view.candidates[0];
    render(<BirthComparisonTable candidate={{ ...candidate, rows: [{
      ...candidate.rows[1], birth: { label: '接口值', detail: [] }, relation: undefined,
    }] }} current={view} />);
    const table = screen.getByRole('table');
    const birth = table.querySelector('.birth-table__dimension .birth-table__birth')!;
    expect(birth).toHaveTextContent('接口值');
    expect(birth.querySelector('.ds-element')).toBeNull();
    expect(birth.querySelector('.birth-table__detail > span')).toHaveAttribute('aria-hidden', 'true');
    expect(within(table).getByText('此维度暂未返回关系说明。')).toBeInTheDocument();
    expect(table.querySelector('.ds-relation__chip')).toBeNull();
  });

  it('gives each candidate independent header associations', () => {
    const view = mapBirthView(createBirthComparisonDto());
    const candidate = view.candidates[0];
    const { container } = render(<>
      <BirthComparisonTable candidate={candidate} current={view} />
      <BirthComparisonTable candidate={{ ...candidate, label: '交界后' }} current={view} />
    </>);
    const ids = [...container.querySelectorAll('[id]')].map(element => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const table of screen.getAllByRole('table')) {
      for (const cell of table.querySelectorAll('[headers]')) {
        for (const id of cell.getAttribute('headers')!.split(' ')) {
          expect([...table.querySelectorAll('th')].some(heading => heading.id === id)).toBe(true);
        }
      }
    }
  });
});
