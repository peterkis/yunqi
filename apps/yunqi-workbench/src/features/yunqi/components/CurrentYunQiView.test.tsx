import { createClientStub, createLearningDto } from '../../../test/learning-fixtures';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { YunQiClient } from '@yunqi/client';
import type { YunQiLearningDto } from '@yunqi/contracts';
import { describe, expect, it, vi } from 'vitest';
import { createTestWrapper } from '../../../test/test-utils';
import { CurrentYunQiView } from './CurrentYunQiView';

describe('CurrentYunQiView', () => {
  it('renders loading while the current request is pending', () => {
    const client: YunQiClient = {
      ...createClientStub(),
      getLearningCurrent: vi.fn(
        () => new Promise<YunQiLearningDto>(() => undefined),
      ),
      getYear: vi.fn(),
      calculate: vi.fn(),
    };

    render(<CurrentYunQiView />, {
      wrapper: createTestWrapper(client),
    });

    expect(screen.getByRole('status')).toHaveTextContent('正在加载');
  });

  it('renders a sanitized failure and retries through the query hook', async () => {
    const user = userEvent.setup();
    const client: YunQiClient = {
      ...createClientStub(),
      getLearningCurrent: vi
        .fn()
        .mockRejectedValueOnce(
          new Error('backend database password leaked'),
        )
        .mockResolvedValueOnce(createLearningDto()),
      getYear: vi.fn(),
      calculate: vi.fn(),
    };

    render(<CurrentYunQiView />, {
      wrapper: createTestWrapper(client),
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('加载失败');
    expect(alert).not.toHaveTextContent(
      'backend database password leaked',
    );

    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(
      await screen.findByRole('region', {
        name: '全年 · 2026',
      }),
    ).toBeVisible();
    expect(client.getLearningCurrent).toHaveBeenCalledTimes(2);
  });

  it('maps successful current data into the read-only page', async () => {
    const client: YunQiClient = {
      ...createClientStub(),
      getLearningCurrent: vi
        .fn()
        .mockResolvedValue(createLearningDto()),
      getYear: vi.fn(),
      calculate: vi.fn(),
    };

    render(<CurrentYunQiView />, {
      wrapper: createTestWrapper(client),
    });

    expect(
      await screen.findByRole('region', {
        name: '全年 · 2026',
      }),
    ).toBeVisible();
    expect(screen.getByText('丙午')).toBeVisible();
    expect(client.getLearningCurrent).toHaveBeenCalledOnce();
  });
});
