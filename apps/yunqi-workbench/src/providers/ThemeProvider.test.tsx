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
  it('applies the design token theme to the existing data-theme wrapper', async () => {
    const user = userEvent.setup();
    const style = document.createElement('style');
    style.textContent = readFileSync('src/styles/tokens.css', 'utf8');
    document.head.append(style);
    try {
      const { container } = render(<ThemeProvider><ThemeControl /></ThemeProvider>);
      const wrapper = container.firstElementChild!;
      expect(getComputedStyle(wrapper).getPropertyValue('--surface-page').trim()).toBe('#fbfaf7');
      expect(getComputedStyle(wrapper).getPropertyValue('--accent').trim()).toBe('#2e5b4f');

      await user.click(screen.getByRole('button', { name: '切换至深色主题' }));
      expect(getComputedStyle(wrapper).getPropertyValue('--surface-page').trim()).toBe('#151816');
      expect(getComputedStyle(wrapper).getPropertyValue('--accent').trim()).toBe('#7fb3a2');

      await user.click(screen.getByRole('button', { name: '切换至浅色主题' }));
      expect(getComputedStyle(wrapper).getPropertyValue('--surface-page').trim()).toBe('#fbfaf7');
    } finally {
      style.remove();
    }
  });

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
