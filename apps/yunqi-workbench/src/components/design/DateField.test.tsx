import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DateField } from './DateField';

function Field({ initial = '', onChange = vi.fn() }) {
  const [value, setValue] = useState(initial);
  return <><DateField label="出生日期（公历）" value={value} required onChange={(next) => { setValue(next); onChange(next); }} /><output>{value}</output><button onClick={() => setValue('')}>清空</button></>;
}

describe('DateField', () => {
  it('uses the caller label for the visible legend and accessible group name', () => {
    const onChange = vi.fn();
    const { rerender } = render(<DateField label="核对日期（公历）" value="" onChange={onChange} />);
    expect(screen.getByText('核对日期（公历）', { selector: 'legend' })).toBeVisible();
    expect(screen.getByRole('group', { name: '核对日期（公历）' })).toBeVisible();
    expect(screen.queryByText('出生日期（公历）')).not.toBeInTheDocument();
    for (const name of ['年', '月', '日']) expect(screen.getByRole('textbox', { name })).toBeVisible();
    rerender(<DateField label="复核日期（公历）" value="" onChange={onChange} />);
    expect(screen.getByRole('group', { name: '复核日期（公历）' })).toBeVisible();
    expect(screen.queryByRole('group', { name: '核对日期（公历）' })).not.toBeInTheDocument();
  });

  it('labels each numeric segment, advances at full length and moves back from an empty segment', async () => {
    const user = userEvent.setup();
    render(<Field />);
    expect(screen.getByRole('group', { name: '出生日期（公历）' })).toBeVisible();
    const [year, month, day] = ['年', '月', '日'].map((name) => screen.getByRole('textbox', { name }));
    for (const input of [year, month, day]) expect(input).toHaveAttribute('inputmode', 'numeric');
    await user.type(year, '1980');
    expect(month).toHaveFocus();
    await user.keyboard('03');
    expect(day).toHaveFocus();
    await user.keyboard('{Backspace}');
    expect(month).toHaveFocus();
    expect(month).toHaveValue('03');
    await user.clear(month);
    await user.keyboard('{Backspace}');
    expect(year).toHaveFocus();
    await user.type(month, '03');
    await user.keyboard('12');
    expect(screen.getByRole('status')).toHaveTextContent('1980-03-12');
    await user.click(screen.getByRole('button', { name: '清空' }));
    expect([year, month, day].every((input) => (input as HTMLInputElement).value === '')).toBe(true);
  });

  it('pastes a canonical date into any segment and reports incomplete edits as empty', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Field onChange={onChange} />);
    screen.getByRole('textbox', { name: '年' }).focus();
    await user.paste('1980-03-12');
    expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('1980');
    expect(screen.getByRole('textbox', { name: '月' })).toHaveValue('03');
    expect(screen.getByRole('textbox', { name: '日' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('1980-03-12');
    await user.clear(screen.getByRole('textbox', { name: '月' }));
    expect(onChange).toHaveBeenLastCalledWith('');
    fireEvent.change(screen.getByRole('textbox', { name: '年' }), { target: { value: '19' } });
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it.each(['1899-03-12', '2101-03-12', '1980-00-12', '1980-13-12', '1980-03-00', '1980-03-32'])('rejects integer range %s without emitting it', async (date) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Field onChange={onChange} />);
    screen.getByRole('textbox', { name: '年' }).focus();
    await user.paste(date);
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(screen.getAllByRole('textbox').some((input) => !(input as HTMLInputElement).checkValidity())).toBe(true);
  });

  it.each(['1900-01-01', '2100-12-31', '1980-02-31'])('accepts %s as syntax and leaves month-day validity to the API', async (date) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Field onChange={onChange} />);
    screen.getByRole('textbox', { name: '日' }).focus();
    await user.paste(date);
    expect(onChange).toHaveBeenLastCalledWith(date);
    expect(screen.getAllByRole('textbox').every((input) => (input as HTMLInputElement).checkValidity())).toBe(true);
  });

  it('supports external values, optional emptiness, plain paste and native invalid/disabled semantics', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onInvalid = vi.fn();
    const { rerender } = render(<DateField label="出生日期（公历）" value="" onChange={onChange} onInvalid={onInvalid} />);
    expect(screen.getByRole('textbox', { name: '年' })).toBeValid();
    screen.getByRole('textbox', { name: '年' }).focus();
    await user.paste('abc');
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(screen.getByRole('textbox', { name: '年' })).toBeInvalid();
    fireEvent.invalid(screen.getByRole('textbox', { name: '年' }));
    expect(onInvalid).toHaveBeenCalled();
    rerender(<DateField label="出生日期（公历）" value="2000-01-02" onChange={onChange} disabled describedBy="hint" />);
    expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('2000');
    expect(screen.getByRole('textbox', { name: '年' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: '年' })).toHaveAttribute('aria-describedby', 'hint');
  });
});
