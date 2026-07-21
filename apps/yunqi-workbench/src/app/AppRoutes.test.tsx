import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { YunQiClient } from '@yunqi/client';
import {
  MemoryRouter,
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../providers/AppProviders';
import { createWorkbenchQueryClient } from '../providers/QueryProvider';
import {
  createYunQiCalculationDto,
  createYunQiYearDto,
} from '../test/yunqi-fixtures';
import { App } from './App';

function RouterProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();

  return (
    <div data-testid="router-probe">
      <output aria-label="测试路径">{location.pathname}</output>
      <output aria-label="测试导航类型">{navigationType}</output>
      <button type="button" onClick={() => navigate(-1)}>
        测试后退
      </button>
    </div>
  );
}

function renderAppAt(route: string, client: YunQiClient) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppProviders
        queryClient={createWorkbenchQueryClient()}
        yunqiClient={client}
      >
        <App />
        <RouterProbe />
      </AppProviders>
    </MemoryRouter>,
  );
}

function createClient(overrides: Partial<YunQiClient> = {}): YunQiClient {
  return {
    getCurrent: vi.fn(),
    getYear: vi.fn(),
    calculate: vi.fn(),
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('AppRoutes', () => {
  it('replaces the root route with the current YunQi route', async () => {
    const client = createClient({
      getCurrent: vi.fn().mockResolvedValue(createYunQiCalculationDto()),
    });

    renderAppAt('/', client);

    expect(
      await screen.findByRole('heading', { name: '当前五运六气' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('测试路径')).toHaveTextContent(
      '/yunqi/current',
    );
    expect(screen.getByLabelText('测试导航类型')).toHaveTextContent(
      'REPLACE',
    );
  });

  it('does not query from the annual entry route', () => {
    const client = createClient();

    renderAppAt('/yunqi/year', client);

    expect(screen.getByText('请选择要分析的年份')).toBeInTheDocument();
    expect(client.getYear).not.toHaveBeenCalled();
    expect(client.getCurrent).not.toHaveBeenCalled();
  });

  it('rejects a malformed URL year without querying', () => {
    const client = createClient();

    renderAppAt('/yunqi/year/abc', client);

    expect(screen.getByRole('alert')).toHaveTextContent(
      /^年份格式错误，请选择四位年份$/,
    );
    expect(client.getYear).not.toHaveBeenCalled();
    expect(client.getCurrent).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range URL year without querying', () => {
    const client = createClient();

    renderAppAt('/yunqi/year/2100', client);

    expect(screen.getByRole('alert')).toHaveTextContent(
      /^年份范围应为 1901–2099$/,
    );
    expect(client.getYear).not.toHaveBeenCalled();
    expect(client.getCurrent).not.toHaveBeenCalled();
  });

  it('queries exactly the validated URL year', async () => {
    const client = createClient({
      getYear: vi.fn().mockResolvedValue(createYunQiYearDto()),
    });

    renderAppAt('/yunqi/year/2026', client);

    expect(
      await screen.findByRole('region', { name: '年度概览' }),
    ).toBeInTheDocument();
    expect(client.getYear).toHaveBeenCalledOnce();
    expect(client.getYear).toHaveBeenCalledWith(2026);
    expect(client.getCurrent).not.toHaveBeenCalled();
  });

  it('renders a not-found page without making a YunQi request', () => {
    const client = createClient();

    renderAppAt('/not-approved', client);

    expect(
      screen.getByRole('heading', { name: '页面未找到' }),
    ).toBeInTheDocument();
    expect(client.getCurrent).not.toHaveBeenCalled();
    expect(client.getYear).not.toHaveBeenCalled();
    expect(client.calculate).not.toHaveBeenCalled();
  });

  it('drops resolved facts while navigating to a pending URL year and restores history', async () => {
    const user = userEvent.setup();
    const pending2027 = deferred<ReturnType<typeof createYunQiYearDto>>();
    const client = createClient({
      getYear: vi.fn((year: number) =>
        year === 2026
          ? Promise.resolve(createYunQiYearDto())
          : pending2027.promise,
      ),
    });

    renderAppAt('/yunqi/year/2026', client);

    expect(await screen.findByText('丙午')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '分析年份' })).toHaveValue(
      '2026',
    );

    await user.selectOptions(
      screen.getByRole('combobox', { name: '分析年份' }),
      '2027',
    );

    expect(screen.getByLabelText('测试路径')).toHaveTextContent(
      '/yunqi/year/2027',
    );
    expect(
      screen.getByText('正在加载年度五运六气数据'),
    ).toBeInTheDocument();
    expect(screen.queryByText('丙午')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '测试后退' }));

    await waitFor(() => {
      expect(screen.getByLabelText('测试路径')).toHaveTextContent(
        '/yunqi/year/2026',
      );
    });
    expect(await screen.findByText('丙午')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '分析年份' })).toHaveValue(
      '2026',
    );
  });
});
