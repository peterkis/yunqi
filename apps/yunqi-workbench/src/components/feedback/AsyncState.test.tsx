import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AsyncState } from './AsyncState';

describe('AsyncState', () => {
  it('renders an accessible loading status before all other states', () => {
    render(
      <AsyncState
        data={{ label: '不应显示' }}
        error={new Error('backend database password leaked')}
        isPending
        renderData={(data) => <p>{data.label}</p>}
      />,
    );

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
});
