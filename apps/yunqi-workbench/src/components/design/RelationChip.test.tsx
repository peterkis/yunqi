import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RelationChip } from './RelationChip';

describe('RelationChip', () => {
  it.each([
    ['favorable', '相得'], ['adverse', '不和'], ['neutral', '天符'],
  ] as const)('renders %s as text with an adjacent explanation', (tone, label) => {
    render(<RelationChip tone={tone} label={label} explanation="用于理解运气关系。" />);
    expect(screen.getByText(label)).toHaveClass(`ds-relation__chip--${tone}`);
    expect(screen.getByText('用于理解运气关系。')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('supports compact labels without supplying a second explanation', () => {
    render(<RelationChip compact tone="favorable" label="从 · 顺" />);
    expect(screen.getByText('从 · 顺')).toHaveClass('ds-relation__chip--compact');
  });

  it('rejects color-only or whitespace labels', () => {
    expect(() => render(<RelationChip tone="adverse" label="" />)).toThrow(/visible label/);
    expect(() => render(<RelationChip tone="neutral" label=" " />)).toThrow(/visible label/);
  });

  it('does not add passive relationship text to the tab order', async () => {
    const user = userEvent.setup();
    render(<><RelationChip tone="neutral" label="同属火" /><button type="button">继续</button></>);
    await user.tab();
    expect(screen.getByRole('button', { name: '继续' })).toHaveFocus();
  });
});
