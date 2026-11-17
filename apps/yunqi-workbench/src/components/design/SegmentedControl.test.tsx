import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

const segments = [{ value: 'male', label: '男' }, { value: 'female', label: '女' }] as const;
function Control() {
  const [value, setValue] = useState<'male' | 'female' | ''>('');
  return <SegmentedControl label="量表所用性别" compact value={value} onChange={setValue} segments={segments} />;
}

describe('SegmentedControl', () => {
  it('provides one tab stop, checked ARIA state and arrow/Home/End selection without a router', async () => {
    const user = userEvent.setup();
    render(<Control />);
    const male = screen.getByRole('radio', { name: '男' });
    const female = screen.getByRole('radio', { name: '女' });
    expect(screen.getByRole('radiogroup', { name: '量表所用性别' })).toHaveClass('ds-segmented-control--compact');
    expect(male).toHaveAttribute('aria-checked', 'false');
    await user.tab();
    expect(male).toHaveFocus();
    for (const [key, target] of [['{ArrowRight}', female], ['{ArrowDown}', male], ['{ArrowLeft}', female], ['{ArrowUp}', male], ['{End}', female], ['{Home}', male]] as const) {
      await user.keyboard(key);
      expect(target).toHaveFocus();
      expect(target).toBeChecked();
      expect(target).toHaveAttribute('tabindex', '0');
    }
    await user.click(female);
    expect(female).toBeChecked();
    expect(male).toHaveAttribute('tabindex', '-1');
    await user.keyboard(' ');
    expect(female).toBeChecked();
  });

  it('skips disabled options, ignores modified/repeated keys and disables the entire control', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const choices = [...segments, { value: 'other', label: '其他' }];
    const { rerender } = render(<SegmentedControl label="测试" value="male" segments={choices.map((item) => ({ ...item, disabled: item.value === 'female' }))} onChange={onChange} />);
    screen.getByRole('radio', { name: '男' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '其他' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: '女' })).toBeDisabled();
    onChange.mockClear();
    await user.keyboard('{Control>}{ArrowLeft}{/Control}{Alt>}{ArrowLeft}{/Alt}{Meta>}{ArrowLeft}{/Meta}{Shift>}{ArrowLeft}{/Shift}x');
    fireEvent.keyDown(screen.getByRole('radio', { name: '其他' }), { key: 'ArrowLeft', repeat: true });
    expect(onChange).not.toHaveBeenCalled();
    rerender(<SegmentedControl label="测试" value="" segments={choices} onChange={onChange} disabled />);
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true');
    for (const button of screen.getAllByRole('radio')) expect(button).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('radio', { name: '男' }), { key: 'ArrowLeft' });
    expect(onChange).not.toHaveBeenCalled();
  });
});
