import { readFileSync } from 'node:fs';
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
  it('keeps the UA color scheme aligned with the explicit theme', () => {
    const stylesheet = readFileSync(
      'src/styles/global.css',
      'utf8',
    );
    const rootDeclarations = stylesheet.match(/:root\s*\{([^}]*)\}/s)?.[1];
    const darkThemeDeclarations = stylesheet.match(
      /\.theme-root\[data-theme="dark"\]\s*\{([^}]*)\}/s,
    )?.[1];

    expect(rootDeclarations).toContain('color-scheme: light;');
    expect(rootDeclarations).not.toContain('color-scheme: light dark;');
    expect(darkThemeDeclarations).toContain('color-scheme: dark;');
  });

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
