import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ScaleOption } from './ScaleOption';

const choices = [
  { shortcut: 1, label: '没有', description: '根本不' },
  { shortcut: 2, label: '很少', description: '有一点' },
  { shortcut: 3, label: '有时', description: '有些' },
  { shortcut: 4, label: '经常', description: '相当' },
  { shortcut: 5, label: '总是', description: '非常' },
] as const;

function Question({ disabledSecond = false }: { readonly disabledSecond?: boolean }) {
  const [selected, setSelected] = useState(1);
  return <div role="radiogroup" aria-label="本题程度">
    {choices.map((choice) => <ScaleOption
      {...choice}
      key={choice.shortcut}
      checked={selected === choice.shortcut}
      tabIndex={selected === choice.shortcut ? 0 : -1}
      disabled={disabledSecond && choice.shortcut === 2}
      onSelect={() => setSelected(choice.shortcut)}
    />)}
  </div>;
}

describe('ScaleOption', () => {
  it('renders each named radio, its description, shortcut, and controlled selection', async () => {
    const user = userEvent.setup();
    render(<Question />);
    expect(screen.getByRole('radiogroup', { name: '本题程度' })).toBeVisible();
    for (const choice of choices) {
      const radio = screen.getByRole('radio', { name: choice.label });
      expect(radio).toHaveAccessibleDescription(choice.description);
      expect(radio).toHaveAttribute('aria-keyshortcuts', String(choice.shortcut));
      expect(radio).toHaveAttribute('aria-checked', String(choice.shortcut === 1));
    }
    await user.click(screen.getByRole('radio', { name: '有时' }));
    expect(screen.getByRole('radio', { name: '有时' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '没有' })).toHaveAttribute('aria-checked', 'false');
  });

  it('is keyboard reachable and supports Space, Enter, and every digit within the group', async () => {
    const user = userEvent.setup();
    render(<Question />);
    await user.tab();
    expect(screen.getByRole('radio', { name: '没有' })).toHaveFocus();
    await user.keyboard(' {Enter}');
    expect(screen.getByRole('radio', { name: '没有' })).toHaveAttribute('aria-checked', 'true');
    for (const choice of [...choices].reverse()) {
      await user.keyboard(String(choice.shortcut));
      expect(screen.getByRole('radio', { name: choice.label })).toHaveFocus();
      expect(screen.getByRole('radio', { name: choice.label })).toHaveAttribute('aria-checked', 'true');
    }
  });

  it('moves focus with arrows, Home and End without changing the answer', async () => {
    const user = userEvent.setup();
    render(<Question />);
    await user.tab();
    for (const [key, label] of [
      ['{ArrowLeft}', '总是'], ['{ArrowRight}', '没有'], ['{ArrowDown}', '很少'],
      ['{ArrowUp}', '没有'], ['{End}', '总是'], ['{Home}', '没有'],
    ]) {
      await user.keyboard(key);
      expect(screen.getByRole('radio', { name: label })).toHaveFocus();
      expect(screen.getByRole('radio', { name: '没有' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getAllByRole('radio').filter((radio) => radio.getAttribute('aria-checked') === 'true')).toHaveLength(1);
    }
  });

  it('skips disabled options and leaves modified or unrelated keys alone', async () => {
    const user = userEvent.setup();
    render(<Question disabledSecond />);
    await user.tab();
    await user.keyboard('2x{Control>}3{/Control}{Alt>}3{/Alt}{Meta>}3{/Meta}{Shift>}3{/Shift}');
    expect(screen.getByRole('radio', { name: '没有' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '很少' })).toBeDisabled();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: '有时' })).toHaveFocus();
  });

  it('isolates shortcuts from sibling and nested groups', async () => {
    const user = userEvent.setup();
    const onOuter = vi.fn();
    const onInner = vi.fn();
    render(<>
      <div role="radiogroup" aria-label="外层">
        <ScaleOption {...choices[0]} checked={false} onSelect={onOuter} />
        <div role="radiogroup" aria-label="内层">
          <ScaleOption {...choices[1]} checked={false} onSelect={onInner} />
        </div>
      </div>
      <Question />
    </>);
    await user.tab();
    await user.keyboard('2');
    expect(onInner).not.toHaveBeenCalled();
    expect(onOuter).not.toHaveBeenCalled();
  });

  it('leaves grouping to the caller while retaining native button activation', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ScaleOption {...choices[2]} checked={false} onSelect={onSelect} />);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    await user.tab();
    await user.keyboard('3');
    expect(onSelect).not.toHaveBeenCalled();
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
