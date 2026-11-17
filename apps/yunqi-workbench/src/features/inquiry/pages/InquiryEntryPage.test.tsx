import { readFileSync } from 'node:fs';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InquiryEntryPage } from './InquiryEntryPage';

describe('InquiryEntryPage', () => {
  it('keeps the three plans in one panel column with no business controls', () => {
    const { container } = render(<InquiryEntryPage />);
    expect(screen.getByRole('heading', { name: '问诊结构化入口' })).toBeInTheDocument();
    expect(screen.getByText('仅展示后续规划；患者信息、问诊采集与记录均未开放。')).toBeInTheDocument();
    const plans = screen.getByRole('region', { name: '未来能力' });
    expect(within(plans).getAllByRole('article')).toHaveLength(3);
    expect(within(plans).getAllByText('规划中', { exact: true })).toHaveLength(3);
    expect(container.querySelectorAll('a, button, input, select, textarea, [tabindex]')).toHaveLength(0);
    expect(container.querySelectorAll('.ds-info-card')).toHaveLength(2);
  });

  it('uses a bounded single-column layout at panel widths', () => {
    const stylesheet = readFileSync('src/styles/views/drilldown.css', 'utf8');
    expect(stylesheet.match(/\.drilldown-page\s*\{([^}]*)\}/s)?.[1]).toContain('min-width: 0;');
    const plans = stylesheet.match(/\.drilldown-inquiry__capabilities\s*\{([^}]*)\}/s)?.[1];
    expect(plans).toContain('display: grid;');
    expect(plans).not.toContain('repeat(');
    expect(stylesheet.match(/\.drilldown-inquiry__capability\s*\{([^}]*)\}/s)?.[1]).toContain('min-width: 0;');
  });
});
