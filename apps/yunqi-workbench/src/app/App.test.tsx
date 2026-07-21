import { render, within } from '@testing-library/react';
import type { YunQiClient } from '@yunqi/client';
import { MemoryRouter } from 'react-router-dom';
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

    const view = render(
      <MemoryRouter initialEntries={['/yunqi/current']}>
        <AppProviders
          queryClient={createWorkbenchQueryClient()}
          yunqiClient={client}
        >
          <App />
        </AppProviders>
      </MemoryRouter>,
    );

    expect(
      await within(view.container).findByRole('heading', {
        name: '当前五运六气',
      }, { timeout: 5_000 }),
    ).toBeInTheDocument();
    const footer = within(view.container).getByRole('contentinfo');
    expect(
      within(footer).getByText('YQ-API-CONTRACT-1.0.0'),
    ).toBeInTheDocument();
    expect(
      within(footer).getByText(
        /不提供自动诊断、辨证或治疗决策/,
      ),
    ).toBeInTheDocument();
  });
});
