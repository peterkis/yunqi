import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { PanelShell } from '../../components/layout/PanelShell';
import { CurrentYunQiPage } from '../../features/yunqi/components/CurrentYunQiPage';
import { mapLearning } from '../../features/yunqi/presentation/map-learning';
import { ThemeProvider } from '../../providers/ThemeProvider';
import { createLearningDto } from '../../test/learning-fixtures';

it('keeps the current skip link within the five-size scale in both themes and keyboard reachable', async () => {
  const user = userEvent.setup();
  const style = document.createElement('style');
  style.textContent = ['tokens.css', 'global.css', 'design-components.css', 'panel-shell.css', 'views/current-yunqi.css']
    .map((file) => readFileSync(`src/styles/${file}`, 'utf8')).join('\n');
  document.head.append(style);
  try {
    const learning = mapLearning(createLearningDto());
    render(<MemoryRouter initialEntries={['/yunqi/current']}><ThemeProvider><PanelShell>
      <CurrentYunQiPage viewModel={learning.facts} learning={learning} />
    </PanelShell></ThemeProvider></MemoryRouter>);
    const skipLink = screen.getByRole('link', { name: '跳至主要内容' });
    const assertFontSize = () => {
      // jsdom retains var() in computed font-size. Resolve this root token
      // only; the unchanged Chromium visual test checks the whole screen.
      const computed = getComputedStyle(skipLink).fontSize;
      const token = computed.match(/^var\((--[^)]+)\)$/)?.[1];
      const pixels = token ? getComputedStyle(document.documentElement).getPropertyValue(token).trim() : computed;
      expect(['40px', '20px', '13.5px', '12px', '11px']).toContain(pixels);
    };
    assertFontSize();
    await user.tab();
    expect(skipLink).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: '切换至深色主题' }));
    assertFontSize();
    skipLink.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
  } finally {
    style.remove();
  }
});
