import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundaryProvider } from './ErrorBoundaryProvider';

describe('ErrorBoundaryProvider', () => {
  it('sanitizes render errors and resets the boundary', async () => {
    const user = userEvent.setup();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    let shouldThrow = true;

    function Child() {
      if (shouldThrow) {
        throw new Error('backend database password leaked');
      }

      return <p>界面已恢复</p>;
    }

    const { container } = render(
      <ErrorBoundaryProvider>
        <Child />
      </ErrorBoundaryProvider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('工作台暂时无法显示');
    expect(container).not.toHaveTextContent('backend database password leaked');
    expect(container.textContent).not.toMatch(/\bat Child\b/);

    shouldThrow = false;
    await user.click(
      screen.getByRole('button', { name: '重新加载界面' }),
    );

    expect(screen.getByText('界面已恢复')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    consoleError.mockRestore();
  });
});
