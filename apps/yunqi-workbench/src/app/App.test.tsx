import { createClientStub } from '../test/learning-fixtures';
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
      ...createClientStub(),
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
      await within(view.container).findByRole('region', {
        name: '全年 · 2026',
      }, { timeout: 5_000 }),
    ).toBeVisible();
    const footer = within(view.container).getByRole('contentinfo');
    expect(footer).toHaveTextContent('五步运为教学口径 · 待专家确认 · 辅助参考，不作诊断依据');
    expect(within(view.container).getByRole('region', { name: '追溯信息' })).toHaveTextContent('YQ-API-CONTRACT-1.2.0');
  });
});
