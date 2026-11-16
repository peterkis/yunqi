import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createClientStub, createLearningDto, createQuestionnaireDto } from '../../../test/learning-fixtures';
import { createTestWrapper } from '../../../test/test-utils';
import { ConstitutionPage } from './ConstitutionPage';

describe('ConstitutionPage', () => {
  it('loads the questionnaire and current context without scoring on entry', async () => {
    const client = createClientStub();
    render(<ConstitutionPage />, { wrapper: createTestWrapper(client) });
    expect(await screen.findByRole('form', { name: '中医体质量表' })).toBeVisible();
    expect(await screen.findByRole('heading', { name: '当前运气参考' })).toBeVisible();
    expect(client.getConstitutionQuestionnaire).toHaveBeenCalledOnce();
    expect(client.getLearningCurrent).toHaveBeenCalledOnce();
    expect(client.assessConstitution).not.toHaveBeenCalled();
  });

  it('shows independent pending and retry states without disclosing raw errors', async () => {
    const user = userEvent.setup();
    const client = createClientStub({
      getConstitutionQuestionnaire: vi.fn().mockRejectedValueOnce(new Error('private standard error')).mockResolvedValueOnce(createQuestionnaireDto()),
      getLearningCurrent: vi.fn().mockRejectedValueOnce(new Error('private current error')).mockResolvedValueOnce(createLearningDto()),
    });
    render(<ConstitutionPage />, { wrapper: createTestWrapper(client) });
    expect(screen.getAllByRole('status')).toHaveLength(2);
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
    expect(screen.queryByText(/private/)).not.toBeInTheDocument();
    const retries = screen.getAllByRole('button', { name: '重试' });
    await user.click(retries[0]);
    await screen.findByRole('form', { name: '中医体质量表' });
    await user.click(screen.getByRole('button', { name: '重试' }));
    await screen.findByRole('heading', { name: '当前运气参考' });
    expect(client.assessConstitution).not.toHaveBeenCalled();
  });
});
