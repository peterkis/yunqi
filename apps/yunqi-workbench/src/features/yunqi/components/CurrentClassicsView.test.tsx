import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { YunQiLearningDto } from '@yunqi/contracts';
import { createClientStub, createLearningDto } from '../../../test/learning-fixtures';
import { createTestWrapper } from '../../../test/test-utils';
import { CurrentClassicsView } from './CurrentClassicsView';

describe('CurrentClassicsView', () => {
  it('loads through the existing learning query', async () => {
    const client = createClientStub({ getLearningCurrent: vi.fn(() => new Promise<YunQiLearningDto>(() => undefined)) });
    render(<CurrentClassicsView />, { wrapper: createTestWrapper(client) });
    expect(await screen.findByRole('status')).toHaveTextContent('正在加载');
  });

  it('sanitizes a failed direct entry and retries into sourced reading', async () => {
    const user = userEvent.setup();
    const client = createClientStub({ getLearningCurrent: vi.fn().mockRejectedValueOnce(new Error('SECRET_STACK')).mockResolvedValueOnce(createLearningDto()) });
    render(<CurrentClassicsView />, { wrapper: createTestWrapper(client) });
    expect(await screen.findByRole('alert')).toHaveTextContent('加载失败');
    expect(screen.queryByText('SECRET_STACK')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));
    expect(await screen.findByRole('group', { name: '原文范围' })).toBeVisible();
    expect(screen.getByRole('link', { name: /^出处/ })).toHaveAttribute('href', 'https://example.org/classics');
    expect(client.getLearningCurrent).toHaveBeenCalledTimes(2);
  });
});
