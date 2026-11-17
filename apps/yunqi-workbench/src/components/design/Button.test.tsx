import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

const icon = <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg>;

describe('Button', () => {
  it.each(['primary', 'secondary', 'text'] as const)('renders the %s variant with its visible name', (variant) => {
    render(<Button variant={variant}>查看原文</Button>);
    const button = screen.getByRole('button', { name: '查看原文' });
    expect(button).toHaveClass(`ds-button--${variant}`);
    expect(button).toHaveAttribute('type', 'button');
  });

  it('defaults to primary, forwards native attributes, and supports keyboard activation', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick} aria-describedby="help">查看原文</Button>);
    const button = screen.getByRole('button', { name: '查看原文' });
    expect(button).toHaveClass('ds-button--primary');
    expect(button).toHaveAttribute('aria-describedby', 'help');
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter} ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('gives the icon button an accessible name and a keyboard tab stop', async () => {
    const user = userEvent.setup();
    render(<Button variant="icon" aria-label="收起">{icon}</Button>);
    const button = screen.getByRole('button', { name: '收起' });
    expect(button).toHaveClass('ds-button--icon');
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    await user.tab();
    expect(button).toHaveFocus();
  });

  it('requires a non-empty accessible name for icon buttons', () => {
    expect(() => render(<Button variant="icon" aria-label=" ">{icon}</Button>)).toThrow(/aria-label/);
    // @ts-expect-error Icon variants must require a label at the public type boundary.
    const unnamed = <Button variant="icon">{icon}</Button>;
    expect(() => render(unnamed)).toThrow(/aria-label/);
  });

  it('keeps disabled buttons out of the tab order and prevents activation', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<><Button disabled onClick={onClick}>提交中</Button><Button type="submit">继续</Button></>);
    await user.tab();
    expect(screen.getByRole('button', { name: '继续' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: '提交中' }));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '继续' })).toHaveAttribute('type', 'submit');
  });
});
