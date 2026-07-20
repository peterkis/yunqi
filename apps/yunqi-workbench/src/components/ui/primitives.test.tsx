import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Badge } from './Badge';
import { Card } from './Card';
import { DataLabel } from './DataLabel';
import { Panel } from './Panel';
import { TimelineItem } from './TimelineItem';

describe('Workbench presentation primitives', () => {
  it('renders a labelled panel with an optional description', () => {
    render(
      <Panel
        eyebrow="Current"
        title="当前五运六气"
        description="规范固定北京时间下的只读结果。"
      >
        <p>内容</p>
      </Panel>,
    );

    const region = screen.getByRole('region', {
      name: '当前五运六气',
    });

    expect(region).toHaveTextContent('Current');
    expect(region).toHaveTextContent(
      '规范固定北京时间下的只读结果。',
    );
    expect(region).toHaveTextContent('内容');
  });

  it('renders a card, data label, and non-judgmental badge tone', () => {
    render(
      <Card title="岁运">
        <DataLabel label="岁运" value="太羽 · 水 · 太过" />
        <Badge tone="accent">司天</Badge>
      </Card>,
    );

    expect(
      screen.getByRole('heading', { name: '岁运' }),
    ).toBeInTheDocument();
    expect(screen.getByText('太羽 · 水 · 太过')).toBeInTheDocument();
    expect(screen.getByText('司天')).toHaveAttribute(
      'data-tone',
      'accent',
    );
  });

  it('connects an independently controlled timeline disclosure', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { rerender } = render(
      <TimelineItem
        id="sixqi-step-3"
        title="三之气"
        summary={<span>客生主</span>}
        isCurrent
        isExpanded={false}
        onToggle={onToggle}
      >
        <p>结构化关系</p>
      </TimelineItem>,
    );

    const button = screen.getByRole('button', {
      name: '展开三之气详情',
    });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute(
      'aria-controls',
      'sixqi-step-3-details',
    );
    expect(
      screen.getByText('结构化关系').closest('[role="region"]'),
    ).not.toBeVisible();

    await user.click(button);
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(
      <TimelineItem
        id="sixqi-step-3"
        title="三之气"
        summary={<span>客生主</span>}
        isCurrent
        isExpanded
        onToggle={onToggle}
      >
        <p>结构化关系</p>
      </TimelineItem>,
    );

    expect(
      screen.getByRole('button', { name: '收起三之气详情' }),
    ).toHaveAttribute('aria-expanded', 'true');
    const detail = screen.getByRole('region', {
      name: '三之气详情',
    });
    expect(detail).toHaveAttribute('id', 'sixqi-step-3-details');
    expect(detail).toBeVisible();
    expect(screen.getByText('当前')).toBeInTheDocument();
  });
});
