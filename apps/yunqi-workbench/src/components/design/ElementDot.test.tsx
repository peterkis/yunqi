import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ElementDot } from './ElementDot';

describe('ElementDot', () => {
  it.each([
    ['wood', '木'], ['fire', '火'], ['earth', '土'], ['metal', '金'], ['water', '水'],
  ] as const)('pairs %s with visible element text and hides the decorative dot', (element, label) => {
    const { container } = render(<ElementDot element={element} />);
    expect(screen.getByText(label)).toBeVisible();
    expect(container.querySelector(`.ds-element__dot--${element}`)).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('supports compact full names and falls back to a visible label for empty input', () => {
    const { container, rerender } = render(<ElementDot element="fire" compact label="少阴君火" />);
    expect(container.firstChild).toHaveClass('ds-element--compact');
    expect(screen.getByText('少阴君火')).toBeVisible();
    rerender(<ElementDot element="metal" label=" " />);
    expect(screen.getByText('金')).toBeVisible();
  });

  it('keeps a passive text marker out of the keyboard tab order', async () => {
    const user = userEvent.setup();
    render(<><ElementDot element="water" /><button type="button">继续</button></>);
    await user.tab();
    expect(screen.getByRole('button', { name: '继续' })).toHaveFocus();
  });

  it('groups a compound label without splitting qi names and retains the empty-label fallback', () => {
    const { container } = render(<ElementDot element="fire" label="  五之气 · 客气少阳相火  " />);
    expect([...container.querySelectorAll('.ds-seg')].map((segment) => segment.textContent)).toEqual(['五之气', '客气少阳相火']);
    expect(container.textContent).toBe('五之气\u202f·\u202f客气少阳相火');
  });
});
