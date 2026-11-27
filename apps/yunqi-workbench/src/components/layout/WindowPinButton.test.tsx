import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WindowPinButton } from './WindowPinButton';

describe('Windows pin', () => {
  it('shows the native preference, waits for confirmation, and reflects changes from the tray', async () => {
    const user = userEvent.setup();
    let complete!: (value: boolean) => void;
    let notify!: (value: boolean) => void;
    const stop = vi.fn();
    const pin = {
      read: async () => false,
      set: vi.fn(() => new Promise<boolean>(resolve => { complete = resolve; })),
      subscribe: async (callback: typeof notify) => { notify = callback; return stop; },
    };
    const view = render(<WindowPinButton pin={pin} />);
    const button = screen.getByRole('button', { name: '窗口置顶' });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    expect(pin.set).toHaveBeenCalledWith(true);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await act(async () => { complete(true); });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    act(() => notify(false));
    expect(button).toHaveAttribute('aria-pressed', 'false');
    view.unmount();
    expect(stop).toHaveBeenCalledOnce();
  });

  it('keeps the confirmed state when unpinning fails and allows a retry', async () => {
    const pin = { read: async () => true, subscribe: async () => () => {},
      set: vi.fn().mockRejectedValueOnce(new Error()).mockResolvedValueOnce(false) };
    render(<WindowPinButton pin={pin} />);
    const button = screen.getByRole('button', { name: '窗口置顶' });
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed','true'));
    await userEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent('置顶设置失败');
    expect(button).toHaveAttribute('aria-pressed','true');
    await userEvent.click(button);
    expect(pin.set).toHaveBeenLastCalledWith(false);
    expect(button).toHaveAttribute('aria-pressed','false');
  });
});
