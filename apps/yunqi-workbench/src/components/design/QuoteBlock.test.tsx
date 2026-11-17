import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { QuoteBlock } from './QuoteBlock';
import { InfoCard } from './InfoCard';

const excerpt = '五之气，畏火临……';
const source = '《素问·六元正纪大论》少阴之政';
const fullQuote = '五之气，畏火临，暑反至，阳迺化，万物迺生迺长荣，民迺康，其病温。';
const notice = '文献线索，非个体发病预测。';

describe('QuoteBlock', () => {
  it('keeps the original, interpretation, and source separate without adding a notice by default', () => {
    const { container } = render(<QuoteBlock label="当下阶段" quote={fullQuote} source={source} interpretation="用于阅读原文，不据此判断个人健康。" />);
    expect(screen.getByRole('blockquote')).toHaveTextContent(`“${fullQuote}”`);
    expect(screen.getByText('阅读释义')).toBeVisible();
    expect(screen.getByText('用于阅读原文，不据此判断个人健康。')).toBeVisible();
    expect(screen.getByText(source).tagName).toBe('FIGCAPTION');
    expect(container.querySelector('figure')?.lastElementChild).toHaveTextContent(source);
    expect(screen.queryByText(notice)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a caller-supplied notice after the source only when requested', () => {
    const { container, rerender } = render(<QuoteBlock quote={fullQuote} source={source} notice={notice} />);
    expect(screen.getByText(notice)).toBeVisible();
    expect(container.querySelector('figure')?.lastElementChild).toHaveTextContent(notice);
    expect(screen.getByText(notice).previousElementSibling).toHaveTextContent(source);

    rerender(<QuoteBlock quote={fullQuote} source={source} />);
    expect(screen.queryByText(notice)).not.toBeInTheDocument();
  });

  it('lets the caller place one notice after the last quotation in a card', () => {
    const { container } = render(
      <InfoCard label="原文与释义">
        <QuoteBlock quote={fullQuote} source={source} />
        <QuoteBlock quote={excerpt} source={source} notice={notice} />
      </InfoCard>,
    );
    const card = screen.getByRole('region', { name: '原文与释义' });
    expect(screen.getAllByRole('blockquote')).toHaveLength(2);
    expect(screen.getAllByText(notice)).toHaveLength(1);
    expect(screen.getByText(notice)).toBeVisible();
    expect(card.lastElementChild?.lastElementChild?.lastElementChild).toHaveTextContent(notice);
    expect(container.querySelectorAll('.ds-quote-block__notice')).toHaveLength(1);
  });

  it('supports a compact excerpt with optional sections absent', () => {
    const { container } = render(<QuoteBlock compact quote={excerpt} source={source} />);
    expect(container.firstChild).toHaveClass('ds-quote-block--compact');
    expect(screen.queryByText('阅读释义')).not.toBeInTheDocument();
    expect(container.querySelector('details')).not.toBeInTheDocument();
    expect(screen.getByRole('blockquote')).toHaveTextContent('……');
  });

  it('uses a native summary to expand the unmodified full passage', async () => {
    const user = userEvent.setup();
    const { container } = render(<QuoteBlock quote={excerpt} source={source} fullQuote={fullQuote} />);
    const summary = screen.getByText('展开全段');
    const details = container.querySelector('details');
    expect(details).not.toHaveAttribute('open');
    expect(screen.getByText(`“${fullQuote}”`)).not.toBeVisible();
    // user-event 14 does not implement summary Tab/Enter/Space defaults.
    // Real keyboard coverage lives in design-foundations.flows.spec.mjs.
    expect(summary.tagName).toBe('SUMMARY');
    expect(summary.tabIndex).toBe(0);
    summary.focus();
    expect(summary).toHaveFocus();
    await user.click(summary);
    expect(details).toHaveAttribute('open');
    expect(screen.getByText(`“${fullQuote}”`)).toBeVisible();
    await user.click(summary);
    expect(details).not.toHaveAttribute('open');
  });

  it('requires a non-empty source', () => {
    expect(() => render(<QuoteBlock quote={excerpt} source=" " />)).toThrow(/source/);
  });
});
