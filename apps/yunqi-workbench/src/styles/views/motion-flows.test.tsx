import { readFileSync } from 'node:fs';
import { render } from '@testing-library/react';
import { expect, it } from 'vitest';

it('explicitly cancels full-only SVG and geometry transitions when switching to reduced', () => {
  const style = document.createElement('style');
  style.textContent = ['craft.css', 'motion-flows.css'].map(file => readFileSync(`src/styles/views/${file}`, 'utf8')).join('\n');
  document.head.append(style);
  try {
    const view = render(<div data-motion="full"><svg className="current-more__chevron" /><div className="motion-segments" data-indicator-animated="true"><span className="motion-segment-indicator" /></div></div>);
    const root = view.container.firstElementChild!;
    const arrow = root.querySelector('svg')!;
    expect(getComputedStyle(arrow).transition).toContain('transform');
    const indicator = root.querySelector('span')!;
    expect(getComputedStyle(indicator).transition).toContain('width');
    root.setAttribute('data-motion', 'reduced');
    // An implicit all/0s can leave an already-running transform alive. The
    // transition property must explicitly become none to cancel it.
    expect(getComputedStyle(arrow).transition).toBe('none');
    expect(getComputedStyle(indicator).transition).toBe('none');
  } finally { style.remove(); }
});
