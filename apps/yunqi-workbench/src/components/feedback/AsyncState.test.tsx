import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AsyncState } from './AsyncState';

afterEach(() => vi.useRealTimers());

describe('AsyncState', () => {
  it('never flashes loading for a response within 200ms and cancels the delayed timer', () => {
    vi.useFakeTimers();
    const renderData = (data: string) => <p>{data}</p>;
    const view = render(<AsyncState data={undefined} error={null} isPending renderData={renderData} />);
    act(() => { vi.advanceTimersByTime(199); });
    view.rerender(<AsyncState data="完成" error={null} isPending={false} renderData={renderData} />);
    expect(screen.getByText('完成')).toBeVisible();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.queryByText('正在加载')).not.toBeInTheDocument();
    expect(screen.getByText('完成')).toBeVisible();
  });

  it.each(['success', 'error', 'empty'])('keeps a shown loader for at least 400ms before %s', (result) => {
    vi.useFakeTimers();
    const renderData = (data: string) => <p>{data}</p>;
    const view = render(<AsyncState data={undefined} error={null} isPending renderData={renderData} />);
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByRole('status')).toHaveTextContent('正在加载');
    view.rerender(<AsyncState data={result === 'success' ? '完成' : undefined}
      error={result === 'error' ? new Error('private') : null} isPending={false} renderData={renderData} />);
    act(() => { vi.advanceTimersByTime(399); });
    expect(screen.getByRole('status')).toHaveTextContent('正在加载');
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByText('正在加载')).not.toBeInTheDocument();
    expect(screen.getByText({ success: '完成', error: '加载失败', empty: '暂无数据' }[result]!)).toBeVisible();
  });

  it('releases a long request immediately on completion, then starts a fresh delay for a new request', () => {
    vi.useFakeTimers();
    const props = { data: '完成', error: null, renderData: (data: string) => <p>{data}</p> };
    const view = render(<AsyncState {...props} isPending />);
    act(() => { vi.advanceTimersByTime(200); });
    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.getByText('正在加载')).toBeVisible();
    view.rerender(<AsyncState {...props} isPending={false} />);
    expect(screen.getByText('完成')).toBeVisible();
    view.rerender(<AsyncState {...props} isPending />);
    act(() => { vi.advanceTimersByTime(199); });
    expect(screen.queryByText('正在加载')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByText('正在加载')).toBeVisible();
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not restart the minimum hold when pending toggles during a visible loader', () => {
    vi.useFakeTimers();
    const props = { data: '完成', error: null, renderData: (data: string) => <p>{data}</p> };
    const view = render(<AsyncState {...props} isPending />);
    act(() => { vi.advanceTimersByTime(200); });
    view.rerender(<AsyncState {...props} isPending={false} />);
    act(() => { vi.advanceTimersByTime(100); });
    view.rerender(<AsyncState {...props} isPending />);
    act(() => { vi.advanceTimersByTime(300); });
    view.rerender(<AsyncState {...props} isPending={false} />);
    expect(screen.getByText('完成')).toBeVisible();
  });
  it('renders an accessible delayed loading status before all other states', () => {
    vi.useFakeTimers();
    render(
      <AsyncState
        data={{ label: '不应显示' }}
        error={new Error('backend database password leaked')}
        isPending
        renderData={(data) => <p>{data.label}</p>}
      />,
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(199); });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByRole('status')).toHaveTextContent('正在加载');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('不应显示')).not.toBeInTheDocument();
  });

  it('renders a sanitized error and invokes retry without exposing the error', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <AsyncState
        data={{ label: '不应显示' }}
        error={new Error('backend database password leaked')}
        isPending={false}
        onRetry={onRetry}
        renderData={(data) => <p>{data.label}</p>}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('加载失败');
    expect(screen.queryByText(/backend database password leaked/)).not.toBeInTheDocument();
    expect(screen.queryByText('不应显示')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders an explicit empty state for missing or empty data', () => {
    const { rerender } = render(
      <AsyncState<string[]>
        data={undefined}
        error={null}
        isPending={false}
        renderData={(data) => <p>{data.join(',')}</p>}
      />,
    );

    expect(screen.getByText('暂无数据')).toBeInTheDocument();

    rerender(
      <AsyncState
        data={[]}
        error={null}
        isPending={false}
        renderData={(data) => <p>{data.join(',')}</p>}
      />,
    );

    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('passes successful data to the supplied renderer', () => {
    render(
      <AsyncState
        data={{ label: '契约数据已就绪' }}
        error={null}
        isPending={false}
        renderData={(data) => <p>{data.label}</p>}
      />,
    );

    expect(screen.getByText('契约数据已就绪')).toBeInTheDocument();
  });

  it('supports feature-specific state messages without changing defaults', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <AsyncState
        data={undefined}
        error={null}
        isPending
        loadingMessage="年度加载中"
        errorMessage="年度加载失败"
        emptyMessage="年度暂无数据"
        renderData={() => null}
      />,
    );

    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByRole('status')).toHaveTextContent('年度加载中');

    rerender(
      <AsyncState
        data={undefined}
        error={new Error('sensitive')}
        isPending={false}
        loadingMessage="年度加载中"
        errorMessage="年度加载失败"
        emptyMessage="年度暂无数据"
        renderData={() => null}
      />,
    );
    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.getByRole('alert')).toHaveTextContent('年度加载失败');

    rerender(
      <AsyncState
        data={undefined}
        error={null}
        isPending={false}
        loadingMessage="年度加载中"
        errorMessage="年度加载失败"
        emptyMessage="年度暂无数据"
        renderData={() => null}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('年度暂无数据');
  });
});
