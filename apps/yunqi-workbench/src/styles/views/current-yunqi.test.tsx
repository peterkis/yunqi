import { MotionProvider } from '../../providers/MotionProvider';
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
  style.textContent = ['tokens.css', 'type-scale.css', 'global.css', 'design-components.css', 'panel-shell.css', 'views/current-yunqi.css', 'views/current-finals.css']
    .map((file) => readFileSync(`src/styles/${file}`, 'utf8')).join('\n');
  document.head.append(style);
  try {
    const learning = mapLearning(createLearningDto());
    render(<MemoryRouter initialEntries={['/yunqi/current']}><MotionProvider><ThemeProvider><PanelShell>
      <CurrentYunQiPage viewModel={learning.facts} learning={learning} />
    </PanelShell></ThemeProvider></MotionProvider></MemoryRouter>);
    const skipLink = screen.getByRole('link', { name: '跳至主要内容' });
    const assertFontSize = () => {
      // jsdom retains var() in computed font-size. Resolve the shared tier and
      // its source token; Chromium checks all visible text in every snapshot.
      let pixels = getComputedStyle(skipLink).fontSize;
      for (let depth = 0; depth < 3; depth += 1) {
        const token = pixels.match(/^var\((--[^)]+)\)$/)?.[1];
        if (!token) break;
        pixels = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
      }
      expect(pixels).toBe('14px');
    };
    assertFontSize();
    const grid = document.querySelector('.current-period-grid')!;
    expect(getComputedStyle(grid).display).toBe('grid');
    expect(getComputedStyle(grid).gridTemplateColumns).toBe('minmax(0, 1fr) var(--current-hairline) minmax(0, 1fr)');
    for (const column of grid.querySelectorAll('.current-period-column')) expect(getComputedStyle(column).display).toBe('contents');
    expect(getComputedStyle(document.querySelector('.current-overview__annual .ds-relation')!).alignItems).toBe('center');
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
