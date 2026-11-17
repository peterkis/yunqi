import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InfoCard } from './InfoCard';
import { ElementDot } from './ElementDot';
import { RelationChip } from './RelationChip';
import { SixQiTimelineItem } from '../../features/yunqi/components/SixQiTimelineItem';
import { mapCurrentYunQi } from '../../features/yunqi/presentation/map-current-yunqi';
import { createYunQiCalculationDto } from '../../test/yunqi-fixtures';

describe('presentation semantics migrated from demo primitives', () => {
  it('renders a labelled card with its description and content', () => {
    render(<InfoCard label="当前五运六气" meta="Current"><p>规范固定北京时间下的只读结果。</p><p>内容</p></InfoCard>);
    const region = screen.getByRole('region', { name: '当前五运六气' });
    expect(region).toHaveTextContent('Current');
    expect(region).toHaveTextContent('规范固定北京时间下的只读结果。');
    expect(region).toHaveTextContent('内容');
  });

  it('renders a fact label, its value and a neutral relation tone', () => {
    render(<InfoCard label="岁运"><dl><dt>岁运</dt><dd><ElementDot element="water" label="水运太过（太羽）" /></dd></dl><RelationChip tone="neutral" label="同气" explanation="主客五行相同。" /></InfoCard>);
    const region = screen.getByRole('region', { name: '岁运' });
    expect(within(region).getByRole('term')).toHaveTextContent('岁运');
    expect(within(region).getByRole('definition')).toHaveTextContent('水运太过（太羽）');
    expect(screen.getByText('同气')).toHaveClass('ds-relation__chip--neutral');
  });

  it('connects an independently controlled stage disclosure', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const step = mapCurrentYunQi(createYunQiCalculationDto()).currentStep;
    const props = { step, onToggle, timelineId: 'sixqi-test', rootRef: null };
    const { rerender } = render(<SixQiTimelineItem {...props} isExpanded={false} />);
    const button = screen.getByRole('button', { name: '展开三之气详情' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', 'sixqi-test-step-3-details');
    expect(screen.getByText('三之气详情').closest('[role="region"]')).not.toBeVisible();
    await user.click(button);
    expect(onToggle).toHaveBeenCalledOnce();
    rerender(<SixQiTimelineItem {...props} isExpanded />);
    expect(screen.getByRole('button', { name: '收起三之气详情' })).toHaveAttribute('aria-expanded', 'true');
    const detail = screen.getByRole('region', { name: '三之气详情' });
    expect(detail).toHaveAttribute('id', 'sixqi-test-step-3-details');
    expect(detail).toBeVisible();
    expect(screen.getByText('当前')).toBeVisible();
  });
});
