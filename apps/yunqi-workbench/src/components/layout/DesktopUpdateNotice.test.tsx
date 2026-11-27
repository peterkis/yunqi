import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DesktopUpdateNotice, type DesktopUpdates } from './DesktopUpdateNotice';

function fixture(overrides: Partial<DesktopUpdates> = {}) {
  return {
    read: vi.fn(async () => ({ version: '0.1.11', digest: 'downloaded-package', scheduled: false, failed: false })),
    choose: vi.fn(async () => {}),
    subscribe: vi.fn(async () => () => {}),
    ...overrides,
  } satisfies DesktopUpdates;
}

afterEach(() => vi.restoreAllMocks());

describe('desktop update notice', () => {
  it('waits for foreground use and postpones without scheduling', async () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    const updates = fixture();
    render(<DesktopUpdateNotice updates={updates} />);
    expect(screen.queryByRole('region', { name: '软件更新' })).toBeNull();
    act(() => { window.dispatchEvent(new Event('focus')); });
    await screen.findByText('运气通 0.1.11 已下载');
    fireEvent.click(screen.getByRole('button', { name: '稍后' }));
    expect(screen.queryByRole('region', { name: '软件更新' })).toBeNull();
    expect(updates.choose).not.toHaveBeenCalled();
  });

  it('schedules the selected package only on explicit approval', async () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    const updates = fixture();
    render(<DesktopUpdateNotice updates={updates} />);
    fireEvent.click(await screen.findByRole('button', { name: '下次启动时安装' }));
    await waitFor(() => expect(updates.choose).toHaveBeenCalledWith('downloaded-package', 'next'));
  });

  it('confirms that restart ends the current session before asking the host', async () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    const updates = fixture({ choose: vi.fn(async () => { throw new Error('offline'); }) });
    render(<DesktopUpdateNotice updates={updates} />);
    fireEvent.click(await screen.findByRole('button', { name: '重启并更新' }));
    expect(screen.getByRole('status')).toHaveTextContent('重启将结束当前会话');
    expect(updates.choose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    fireEvent.click(screen.getByRole('button', { name: '重启并更新' }));
    fireEvent.click(screen.getByRole('button', { name: '确认重启' }));
    await screen.findByText('更新暂不可安装，当前版本可继续使用。');
    expect(updates.choose).toHaveBeenCalledWith('downloaded-package', 'now');
  });
});
