import { render, screen } from '@testing-library/react';
import type { YunQiClient } from '@yunqi/client';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../providers/AppProviders';
import { createWorkbenchQueryClient } from '../providers/QueryProvider';
import { createYunQiCalculationDto } from '../test/yunqi-fixtures';
import { App } from './App';

describe('App', () => {
  it('renders the real current view against the frozen contract', async () => {
    const client: YunQiClient = {
      getCurrent: vi
        .fn()
        .mockResolvedValue(createYunQiCalculationDto()),
      getYear: vi.fn(),
      calculate: vi.fn(),
    };

    render(
      <AppProviders
        queryClient={createWorkbenchQueryClient()}
        yunqiClient={client}
      >
        <App />
      </AppProviders>,
    );

    expect(
      await screen.findByRole('heading', {
        name: '当前五运六气',
      }, { timeout: 5_000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('YQ-API-CONTRACT-1.0.0')).toBeInTheDocument();
    expect(
      screen.getByText(/不提供自动诊断、辨证或治疗决策/),
    ).toBeInTheDocument();
  });
});
