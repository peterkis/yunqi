import { createClientStub } from '../test/learning-fixtures';
import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { YunQiClient } from '@yunqi/client';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../providers/AppProviders';
import { createWorkbenchQueryClient } from '../providers/QueryProvider';
import { createYunQiCalculationDto } from '../test/yunqi-fixtures';
import { App } from './App';

describe('App', () => {
  it('renders the real current view against the frozen contract', async () => {
    const user = userEvent.setup();
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
    expect(footer).toHaveTextContent('五步运为教学口径，待专家确认 · 辅助参考，不作诊断依据');
    const summary = within(view.container).getByText('计算说明与版本');
    const calculation = summary.closest('details')!;
    const trace = within(calculation).getByRole('region', { name: '追溯信息' });
    expect(calculation).not.toHaveAttribute('open');
    expect(trace).not.toBeVisible();
    await user.click(summary);
    expect(trace).toBeVisible();
    expect(trace).toHaveTextContent('YQ-API-CONTRACT-1.2.0');
    expect(within(trace).getByText(/YQ-API-CONTRACT-1\.2\.0/)).toBeVisible();
    expect(within(trace).getByText(/YQ-MVP-RULES-1\.1\.0/)).toBeVisible();
  });
});
