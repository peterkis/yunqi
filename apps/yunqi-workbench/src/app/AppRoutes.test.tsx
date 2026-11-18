import { createClientStub, createLearningDto } from '../test/learning-fixtures';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
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

function renderAppAt(route: string, client: YunQiClient, queryClient = createWorkbenchQueryClient()) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppProviders
        queryClient={queryClient}
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
    ...createClientStub(),
    getCurrent: vi.fn(),
    getYear: vi.fn(),
    calculate: vi.fn(),
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>(
    (resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    },
  );
  return {
    promise,
    resolve,
    reject,
  };
}

describe('AppRoutes', () => {
  it('opens current classics through the internal card and returns to current with route focus and titles', async () => {
    const user = userEvent.setup();
    const client = createClient();
    renderAppAt('/yunqi/current', client);
    const link = await screen.findByRole('link', { name: '原文与释义' });
    link.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('测试路径')).toHaveTextContent('/yunqi/current/classics');
    expect(screen.getByRole('region', { name: '页面导航' })).toHaveTextContent('原文与释义');
    expect(await screen.findByRole('group', { name: '原文范围' })).toBeVisible();
    expect(screen.getByRole('main')).toHaveFocus();
    await waitFor(() => expect(document.title).toBe('原文与释义 · 运气通'));
    await user.click(screen.getByRole('button', { name: '返回' }));
    expect(screen.getByLabelText('测试路径')).toHaveTextContent('/yunqi/current');
    expect(await screen.findByRole('region', { name: '全年\u202f·\u202f2026' })).toBeVisible();
    expect(screen.getByRole('link', { name: '原文与释义' })).toHaveFocus();
    expect(client.getYear).not.toHaveBeenCalled();
    expect(client.calculate).not.toHaveBeenCalled();
  });

  it('can open the classics drilldown directly and return without browser history', async () => {
    const user = userEvent.setup();
    const client = createClient();
    renderAppAt('/yunqi/current/classics', client);
    expect(await screen.findByRole('group', { name: '原文范围' })).toBeVisible();
    expect(client.getLearningCurrent).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: '返回' }));
    expect(screen.getByLabelText('测试路径')).toHaveTextContent('/yunqi/current');
    expect(await screen.findByRole('region', { name: '全年\u202f·\u202f2026' })).toBeVisible();
  });

  it('replaces the root route with the current YunQi route', async () => {
    const client = createClient({
      ...createClientStub(),
      getCurrent: vi.fn().mockResolvedValue(createYunQiCalculationDto()),
    });

    renderAppAt('/', client);

    expect(
      await screen.findByRole(
        'region',
        { name: '全年\u202f·\u202f2026' },
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('测试路径')).toHaveTextContent(
      '/yunqi/current',
    );
    expect(screen.getByLabelText('测试导航类型')).toHaveTextContent(
      'REPLACE',
    );
  });

  it('defaults the annual entry to the API current YunQi year using replace navigation', async () => {
    const current = createLearningDto();
    const client = createClient({
      getLearningCurrent: vi.fn().mockResolvedValue({ ...current, facts: { ...current.facts, year: 2023 } }),
      getYear: vi.fn().mockResolvedValue({ ...createYunQiYearDto(), year: 2023 }),
    });

    renderAppAt('/yunqi/year', client);

    await waitFor(() => expect(screen.getByRole('combobox', { name: '分析年份' })).toHaveValue('2023'));
    expect(screen.getByLabelText('测试路径')).toHaveTextContent('/yunqi/year/2023');
    expect(screen.getByLabelText('测试导航类型')).toHaveTextContent('REPLACE');
    expect(await screen.findByRole('region', { name: '年度概览' })).toBeVisible();
    expect(client.getLearningCurrent).toHaveBeenCalledOnce();
    expect(client.getYear).toHaveBeenCalledWith(2023);
    expect(client.getCurrent).not.toHaveBeenCalled();
    expect(screen.getByRole('main')).toHaveAccessibleName('年度详情');
  });

  it('keeps the annual empty state while the current API is pending or unavailable, even with cached facts', async () => {
    const current = deferred<ReturnType<typeof createLearningDto>>();
    const client = createClient({ getLearningCurrent: vi.fn(() => current.promise) });
    const queryClient = createWorkbenchQueryClient();
    queryClient.setQueryData(['yunqi', 'learning', 'current'], createLearningDto());
    renderAppAt('/yunqi/year', client, queryClient);
    expect(screen.getByText('请选择要分析的年份')).toBeVisible();
    expect(screen.getByRole('combobox', { name: '分析年份' })).toHaveValue('');
    current.reject(new Error('unavailable'));
    await waitFor(() => expect(queryClient.getQueryState(['yunqi', 'learning', 'current'])?.status).toBe('error'));
    expect(client.getLearningCurrent).toHaveBeenCalledOnce();
    expect(screen.getByRole('combobox', { name: '分析年份' })).toHaveValue('');
    expect(client.getYear).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '上一年' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '下一年' })).toBeDisabled();
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

    renderAppAt('/yunqi/year/2101', client);

    expect(screen.getByRole('alert')).toHaveTextContent(
      /^年份范围应为 1900–2100$/,
    );
    expect(client.getYear).not.toHaveBeenCalled();
    expect(client.getCurrent).not.toHaveBeenCalled();
  });

  it('queries exactly the validated URL year', async () => {
    const client = createClient({
      ...createClientStub(),
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
      within(screen.getByRole('main')).getByRole('heading', { name: '页面未找到' }),
    ).toBeInTheDocument();
    expect(client.getCurrent).not.toHaveBeenCalled();
    expect(client.getYear).not.toHaveBeenCalled();
    expect(client.calculate).not.toHaveBeenCalled();
  });

  it('renders the read-only inquiry entry without making a request', () => {
    const client = createClient();

    renderAppAt('/yunqi/inquiry', client);

    expect(
      screen.getByRole('heading', { name: '问诊结构化入口' }),
    ).toBeInTheDocument();

    const capabilities = screen.getByRole('region', {
      name: '未来能力',
    });
    const cards = within(capabilities).getAllByRole('article');

    expect(cards).toHaveLength(3);
    expect(
      within(capabilities).getByRole('heading', {
        name: '患者上下文',
      }),
    ).toBeInTheDocument();
    expect(
      within(capabilities).getByRole('heading', {
        name: '历史记录',
      }),
    ).toBeInTheDocument();
    expect(
      within(capabilities).getByRole('heading', {
        name: '新建结构化记录',
      }),
    ).toBeInTheDocument();
    expect(within(capabilities).getAllByText('规划中')).toHaveLength(3);
    expect(within(capabilities).queryByRole('link')).not.toBeInTheDocument();
    expect(within(capabilities).queryByRole('button')).not.toBeInTheDocument();
    expect(
      within(capabilities).queryByText('aria-disabled'),
    ).not.toBeInTheDocument();
    expect(client.getCurrent).not.toHaveBeenCalled();
    expect(client.getYear).not.toHaveBeenCalled();
    expect(client.calculate).not.toHaveBeenCalled();
  });

  it('makes the control-free inquiry content reachable by Tab', async () => {
    const user = userEvent.setup();
    renderAppAt('/yunqi/inquiry', createClient());
    const main = screen.getByRole('main');
    expect(main.querySelectorAll('button, input, select, textarea, a, [tabindex]')).toHaveLength(0);
    screen.getByRole('button', { name: '返回' }).focus();

    await user.tab();

    expect(main).toHaveFocus();
    expect(main).toHaveAccessibleName('问诊规划');
    await user.click(screen.getByRole('link', { name: '跳至主要内容' }));
    expect(main).toHaveFocus();
  });

  it('opens the planning link while the annual default is pending without querying planning data', async () => {
    const user = userEvent.setup();
    const client = createClient({ getLearningCurrent: vi.fn(() => new Promise<ReturnType<typeof createLearningDto>>(() => {})) });
    renderAppAt('/yunqi/year', client);
    const more = screen.getByRole('navigation', { name: '更多' });
    expect(within(more).getByRole('link', { name: '指定时点 ›' })).toHaveAttribute('href', '/yunqi/calculate');
    await user.click(within(more).getByRole('link', { name: '问诊规划 ›' }));
    expect(screen.getByLabelText('测试路径')).toHaveTextContent('/yunqi/inquiry');
    expect(screen.getByRole('main')).toHaveFocus();
    expect(screen.queryByRole('navigation', { name: '工作台导航' })).not.toBeInTheDocument();
    expect(client.getLearningCurrent).toHaveBeenCalledOnce();
    expect(client.getYear).not.toHaveBeenCalled();
    expect(client.calculate).not.toHaveBeenCalled();
  });

  it.each([1900, 2100])('bounds adjacent URL navigation at %s', async (year) => {
    const user = userEvent.setup();
    const client = createClient({ getYear: vi.fn().mockResolvedValue(createYunQiYearDto()) });
    renderAppAt(`/yunqi/year/${year}`, client);
    expect(screen.getByRole('combobox', { name: '分析年份' })).toHaveValue(String(year));
    const bounded = screen.getByRole('button', { name: year === 1900 ? '上一年' : '下一年' });
    expect(bounded).toBeDisabled();
    await user.click(bounded);
    expect(screen.getByLabelText('测试路径')).toHaveTextContent(`/yunqi/year/${year}`);
    const next = year === 1900 ? '下一年' : '上一年';
    await user.click(screen.getByRole('button', { name: next }));
    expect(screen.getByLabelText('测试路径')).toHaveTextContent(`/yunqi/year/${year === 1900 ? 1901 : 2099}`);
    expect(screen.getByRole('button', { name: next })).toHaveFocus();
  });

  it('renders the specified-time entry and keeps the initial state request-free', () => {
    const client = createClient();

    renderAppAt('/yunqi/calculate', client);

    expect(
      screen.getByRole('heading', { name: '指定时点分析' }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: '页面导航' })).getByRole('heading', { name: '指定时点' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '工作台导航' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('分析时间')).toHaveAttribute(
      'type',
      'datetime-local',
    );
    expect(
      screen.getByText('北京时间 UTC+08'),
    ).toBeInTheDocument();
    expect(client.calculate).not.toHaveBeenCalled();
    expect(client.getCurrent).not.toHaveBeenCalled();
    expect(client.getYear).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('region', { name: '指定时点分析结果' }),
    ).not.toBeInTheDocument();
  });

  it('shows an accessible error when native validation blocks an empty submit', async () => {
    const user = userEvent.setup();
    const client = createClient();

    renderAppAt('/yunqi/calculate', client);

    await user.click(
      screen.getByRole('button', { name: '开始分析' }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      '请输入合法的北京时间',
    );
    expect(screen.getByLabelText('分析时间')).toHaveFocus();
    expect(screen.getByLabelText('分析时间')).toHaveAttribute(
      'aria-describedby', 'time-analysis-hint time-analysis-error',
    );
    expect(client.calculate).not.toHaveBeenCalled();
  });

  it('rejects retained fractional seconds through the submit normalizer', () => {
    const client = createClient();

    renderAppAt('/yunqi/calculate', client);

    const input = screen.getByLabelText('分析时间');
    fireEvent.change(input, {
      target: { value: '2026-05-20T13:30:45.000' },
    });
    expect(input).toHaveValue('2026-05-20T13:30:45.000');
    fireEvent.submit(
      screen.getByRole('form', { name: '指定时点分析表单' }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      '请输入合法的北京时间',
    );
    expect(client.calculate).not.toHaveBeenCalled();
  });

  it('shows an accessible error for a keyboard empty submit without requesting', async () => {
    const user = userEvent.setup();
    const client = createClient();
    renderAppAt('/yunqi/calculate', client);
    screen.getByRole('button', { name: '开始分析' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('请输入合法的北京时间');
    expect(screen.getByLabelText('分析时间')).toHaveFocus();
    expect(client.calculate).not.toHaveBeenCalled();
  });

  it('hides the result when edited and clears dirty feedback after an empty submit', async () => {
    const user = userEvent.setup();
    const client = createClient({
      calculate: vi.fn().mockResolvedValue(createYunQiCalculationDto()),
    });
    renderAppAt('/yunqi/calculate', client);
    const input = screen.getByLabelText('分析时间');
    fireEvent.change(input, { target: { value: '2026-05-20T13:30' } });
    await user.click(screen.getByRole('button', { name: '开始分析' }));
    await screen.findByRole('region', { name: '指定时点分析结果' });
    expect(client.calculate).toHaveBeenCalledExactlyOnceWith({
      dateTime: '2026-05-20T13:30:00+08:00',
    });
    fireEvent.change(input, { target: { value: '2026-05-21T13:30' } });
    expect(screen.getByText('输入已修改，请重新分析')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '指定时点分析结果' })).not.toBeInTheDocument();
    expect(client.calculate).toHaveBeenCalledOnce();
    fireEvent.change(input, { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: '开始分析' }));
    expect(screen.getByRole('alert')).toHaveTextContent('请输入合法的北京时间');
    expect(screen.queryByText('输入已修改，请重新分析')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '指定时点分析结果' })).not.toBeInTheDocument();
    expect(client.calculate).toHaveBeenCalledOnce();
  });

  it('submits one normalized request and renders the API canonical result', async () => {
    const user = userEvent.setup();
    const dto = createYunQiCalculationDto();
    const client = createClient({
      calculate: vi.fn().mockResolvedValue(dto),
    });

    renderAppAt('/yunqi/calculate', client);

    fireEvent.change(screen.getByLabelText('分析时间'), {
      target: { value: '2026-05-20T13:30' },
    });
    await waitFor(() =>
      expect(screen.getByLabelText('分析时间')).toHaveValue(
        '2026-05-20T13:30',
      ),
    );
    fireEvent.submit(
      screen.getByRole('form', { name: '指定时点分析表单' }),
    );

    await waitFor(() =>
      expect(client.calculate).toHaveBeenCalledOnce(),
    );
    expect(client.calculate).toHaveBeenCalledWith({
      dateTime: '2026-05-20T13:30:00+08:00',
    });
    const result = await screen.findByRole('region', { name: '指定时点分析结果' });
    expect(result).toBeVisible();
    const compactTime = result.querySelector('.drilldown-time-result__time time');
    expect(compactTime).toHaveTextContent('06-19 12:00');
    expect(compactTime).toHaveAttribute('datetime', dto.input.localTime);
    const summary = within(result).getByText('计算说明与版本');
    const calculation = summary.closest('details')!;
    const exactTime = within(calculation).getByText('2026-06-19 12:00:00');
    expect(calculation).not.toHaveAttribute('open');
    expect(exactTime).not.toBeVisible();
    await user.click(summary);
    expect(exactTime).toBeVisible();
    expect(exactTime).toHaveAttribute('datetime', dto.input.localTime);
  });

  it('hides the first result while a second request is pending and after it fails', async () => {
    const secondRequest = deferred<ReturnType<
      typeof createYunQiCalculationDto
    >>();
    const calculate = vi
      .fn()
      .mockResolvedValueOnce(createYunQiCalculationDto())
      .mockReturnValueOnce(secondRequest.promise);
    const client = createClient({ calculate });

    renderAppAt('/yunqi/calculate', client);

    fireEvent.change(screen.getByLabelText('分析时间'), {
      target: { value: '2026-05-20T13:30' },
    });
    await waitFor(() =>
      expect(screen.getByLabelText('分析时间')).toHaveValue(
        '2026-05-20T13:30',
      ),
    );
    fireEvent.submit(
      screen.getByRole('form', { name: '指定时点分析表单' }),
    );
    expect(
      await screen.findByRole('region', {
        name: '指定时点分析结果',
      }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('分析时间'), {
      target: { value: '2026-05-21T13:30' },
    });
    await waitFor(() =>
      expect(screen.getByLabelText('分析时间')).toHaveValue(
        '2026-05-21T13:30',
      ),
    );
    fireEvent.submit(
      screen.getByRole('form', { name: '指定时点分析表单' }),
    );

    await waitFor(() => expect(calculate).toHaveBeenCalledTimes(2));
    expect(
      screen.queryByRole('region', {
        name: '指定时点分析结果',
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '正在分析' }),
    ).toBeDisabled();

    secondRequest.reject(new Error('network failure'));

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('指定时点分析失败，请重试');
    expect(
      screen.queryByRole('region', {
        name: '指定时点分析结果',
      }),
    ).not.toBeInTheDocument();
  });

  it('ignores duplicate submits while the calculate request is pending', async () => {
    const pendingRequest = deferred<ReturnType<
      typeof createYunQiCalculationDto
    >>();
    const calculate = vi.fn().mockReturnValue(pendingRequest.promise);
    const client = createClient({ calculate });

    renderAppAt('/yunqi/calculate', client);

    fireEvent.change(screen.getByLabelText('分析时间'), {
      target: { value: '2026-05-20T13:30' },
    });
    await waitFor(() =>
      expect(screen.getByLabelText('分析时间')).toHaveValue(
        '2026-05-20T13:30',
      ),
    );
    const form = screen.getByRole('form', {
      name: '指定时点分析表单',
    });
    fireEvent.submit(form);
    await waitFor(() => expect(calculate).toHaveBeenCalledOnce());
    expect(screen.getByLabelText('分析时间')).toBeDisabled();

    fireEvent.submit(form);

    expect(calculate).toHaveBeenCalledOnce();
    pendingRequest.resolve(createYunQiCalculationDto());
  });

  it('retries a failed request and renders the recovered result', async () => {
    const calculate = vi
      .fn()
      .mockRejectedValueOnce(new Error('network failure'))
      .mockResolvedValueOnce(createYunQiCalculationDto());
    const client = createClient({ calculate });

    renderAppAt('/yunqi/calculate', client);

    fireEvent.change(screen.getByLabelText('分析时间'), {
      target: { value: '2026-05-20T13:30' },
    });
    await waitFor(() =>
      expect(screen.getByLabelText('分析时间')).toHaveValue(
        '2026-05-20T13:30',
      ),
    );
    fireEvent.submit(
      screen.getByRole('form', { name: '指定时点分析表单' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '指定时点分析失败，请重试',
    );

    fireEvent.click(screen.getByRole('button', { name: '重试' }));

    await waitFor(() => expect(calculate).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('region', {
        name: '指定时点分析结果',
      }),
    ).toBeInTheDocument();
  });

  it.each([
    '/yunqi/inquiry/patient',
    '/yunqi/inquiry/history',
    '/yunqi/inquiry/new',
  ])('keeps the unapproved inquiry child route %s unavailable', (route) => {
    const client = createClient();

    renderAppAt(route, client);

    expect(
      within(screen.getByRole('main')).getByRole('heading', { name: '页面未找到' }),
    ).toBeInTheDocument();
    expect(client.getCurrent).not.toHaveBeenCalled();
    expect(client.getYear).not.toHaveBeenCalled();
    expect(client.calculate).not.toHaveBeenCalled();
  });

  it('drops resolved facts while navigating to a pending URL year and restores history', async () => {
    const user = userEvent.setup();
    const pending2027 = deferred<ReturnType<typeof createYunQiYearDto>>();
    const client = createClient({
      ...createClientStub(),
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
      await screen.findByText('正在加载 2027 年年度五运六气数据'),
    ).toBeInTheDocument();
    expect(screen.queryByText('丙午')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '分析年份' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: '收起为胶囊条' }));
    const expand = screen.getByRole('button', { name: /^展开运气通/ });
    expect(expand).toHaveTextContent('本视图暂无运气摘要');
    expect(expand).not.toHaveTextContent('丙午');
    await user.click(expand);

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
