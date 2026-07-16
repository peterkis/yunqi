import { describe, expect, it, vi } from 'vitest';
import {
  YunQiApiError,
  createAxiosTransport,
  createFetchTransport,
  createYunQiClient,
  yunqiQueryOptions,
  type AxiosLike,
  type TransportRequest,
  type YunQiTransport,
} from '../src/contracts/yunqi-api.js';

function createRecordingTransport(payload: unknown): {
  readonly requests: TransportRequest[];
  readonly transport: YunQiTransport;
} {
  const requests: TransportRequest[] = [];

  return {
    requests,
    transport: {
      async request<T>(request: TransportRequest): Promise<T> {
        requests.push(request);
        return payload as T;
      },
    },
  };
}

describe('browser YunQi client', () => {
  it('gets a year through the transport and unwraps its data', async () => {
    const annual = { year: 2024 };
    const { requests, transport } = createRecordingTransport({
      code: 'SUCCESS',
      message: '',
      data: annual,
    });
    const client = createYunQiClient(transport);

    await expect(client.getYear(2024)).resolves.toBe(annual);
    expect(requests).toEqual([
      {
        method: 'GET',
        path: '/api/v1/yunqi/year/2024',
      },
    ]);
  });

  it('gets the current calculation through the transport and unwraps its data', async () => {
    const calculation = { year: 2024, currentStep: { index: 3 } };
    const { requests, transport } = createRecordingTransport({
      code: 'SUCCESS',
      message: '',
      data: calculation,
    });
    const client = createYunQiClient(transport);

    await expect(client.getCurrent()).resolves.toBe(calculation);
    expect(requests).toEqual([
      {
        method: 'GET',
        path: '/api/v1/yunqi/current',
      },
    ]);
  });

  it('posts a calculation request through the transport and unwraps its data', async () => {
    const body = { dateTime: '2024-05-20T21:00:00' };
    const calculation = { year: 2024, currentStep: { index: 3 } };
    const { requests, transport } = createRecordingTransport({
      code: 'SUCCESS',
      message: '',
      data: calculation,
    });
    const client = createYunQiClient(transport);

    await expect(client.calculate(body)).resolves.toBe(calculation);
    expect(requests).toEqual([
      {
        method: 'POST',
        path: '/api/v1/yunqi/calculate',
        body,
      },
    ]);
  });

  it('serializes JSON requests with the Fetch transport', async () => {
    const payload = {
      code: 'SUCCESS',
      message: '',
      data: { year: 2024 },
    };
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(payload));
    const transport = createFetchTransport({
      baseUrl: 'https://yunqi.example/',
      fetchImpl,
    });
    const request = {
      method: 'POST' as const,
      path: '/api/v1/yunqi/calculate',
      body: { dateTime: '2024-05-20T21:00:00' },
    };

    await expect(transport.request(request)).resolves.toEqual(payload);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://yunqi.example/api/v1/yunqi/calculate',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify(request.body),
      },
    );
  });

  it('maps non-success Fetch responses to YunQiApiError', async () => {
    const errorResponse = {
      code: 'INVALID_ARGUMENT' as const,
      message: '请求参数无效',
      details: { field: 'dateTime' },
    };
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(errorResponse, {
        status: 400,
      }),
    );
    const transport = createFetchTransport({
      baseUrl: 'https://yunqi.example',
      fetchImpl,
    });

    const result = transport.request({
      method: 'GET',
      path: '/api/v1/yunqi/year/1800',
    });

    await expect(result).rejects.toEqual(
      expect.objectContaining<Partial<YunQiApiError>>({
        name: 'YunQiApiError',
        message: errorResponse.message,
        status: 400,
        response: errorResponse,
      }),
    );
  });

  it('adapts an Axios-compatible structural instance', async () => {
    const payload = {
      code: 'SUCCESS',
      message: '',
      data: { year: 2024 },
    };
    type AxiosRequestConfig = Parameters<AxiosLike['request']>[0];
    const request = vi.fn(async (_config: AxiosRequestConfig) => ({
      data: payload,
    }));
    const axios: AxiosLike = {
      request<T>(config: AxiosRequestConfig) {
        return request(config) as Promise<{ data: T }>;
      },
    };
    const transport = createAxiosTransport(axios);

    await expect(
      transport.request({
        method: 'GET',
        path: '/api/v1/yunqi/year/2024',
      }),
    ).resolves.toEqual(payload);
    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/v1/yunqi/year/2024',
      data: undefined,
    });
  });

  it('returns TanStack Query-compatible year and current options', () => {
    const { transport } = createRecordingTransport({
      code: 'SUCCESS',
      message: '',
      data: { year: 2024 },
    });
    const client = createYunQiClient(transport);

    const yearOptions = yunqiQueryOptions.year(2024, client);
    const currentOptions = yunqiQueryOptions.current(client);

    expect(yearOptions.queryKey).toEqual(['yunqi', 'year', 2024]);
    expect(yearOptions.queryFn).toBeTypeOf('function');
    expect(currentOptions.queryKey).toEqual(['yunqi', 'current']);
    expect(currentOptions.queryFn).toBeTypeOf('function');
  });
});
