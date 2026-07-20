import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from './FeedbackStates';

describe('feedback states', () => {
  it('renders an accessible loading state', () => {
    render(<LoadingState />);

    expect(screen.getByRole('status')).toHaveTextContent(
      '正在加载五运六气数据',
    );
  });

  it('renders a sanitized error state and retry action', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<ErrorState onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      '暂时无法取得五运六气数据',
    );
    await user.click(screen.getByRole('button', { name: '重新尝试' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders an explicit empty state', () => {
    render(<EmptyState />);

    expect(screen.getByRole('status')).toHaveTextContent(
      '当前没有可展示的五运六气数据',
    );
  });
});

