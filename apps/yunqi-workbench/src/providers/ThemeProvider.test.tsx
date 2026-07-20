import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeProvider';

function ThemeControl() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button type="button" onClick={toggleTheme}>
      切换至{theme === 'light' ? '深色' : '浅色'}主题
    </button>
  );
}

describe('ThemeProvider', () => {
  it('starts in light mode and explicitly toggles to dark mode', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ThemeProvider>
        <ThemeControl />
      </ThemeProvider>,
    );

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveAttribute('data-theme', 'light');

    await user.click(
      screen.getByRole('button', { name: '切换至深色主题' }),
    );

    expect(wrapper).toHaveAttribute('data-theme', 'dark');
    expect(
      screen.getByRole('button', { name: '切换至浅色主题' }),
    ).toBeInTheDocument();
  });
});
