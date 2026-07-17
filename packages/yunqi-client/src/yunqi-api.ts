import type {
  ApiErrorResponse,
  CalculateRequest,
  CalculationSuccessResponse,
  YearSuccessResponse,
  YunQiCalculationDto,
  YunQiYearDto,
} from '@yunqi/contracts';

export interface TransportRequest {
  readonly method: 'GET' | 'POST';
  readonly path: string;
  readonly body?: unknown;
}

export interface YunQiTransport {
  request<T>(request: TransportRequest): Promise<T>;
}

export interface AxiosLike {
  request<T>(config: {
    readonly method: 'GET' | 'POST';
    readonly url: string;
    readonly data?: unknown;
  }): Promise<{ readonly data: T }>;
}

export class YunQiApiError extends Error {
  constructor(
    readonly status: number,
    readonly response: ApiErrorResponse,
  ) {
    super(response.message);
    this.name = 'YunQiApiError';
  }
}

export interface YunQiClient {
  getYear(year: number): Promise<YunQiYearDto>;
  getCurrent(): Promise<YunQiCalculationDto>;
  calculate(request: CalculateRequest): Promise<YunQiCalculationDto>;
}

export interface FetchTransportOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
}

export function createFetchTransport(
  options: FetchTransportOptions,
): YunQiTransport {
  const fetchImpl =
    options.fetchImpl ??
    ((input: RequestInfo | URL, init?: RequestInit) =>
      globalThis.fetch(input, init));
  const baseUrl = options.baseUrl.replace(/\/$/, '');

  return {
    async request<T>(request: TransportRequest): Promise<T> {
      const response = await fetchImpl(baseUrl + request.path, {
        method: request.method,
        headers: {
          accept: 'application/json',
          ...(request.body === undefined
            ? {}
            : { 'content-type': 'application/json' }),
        },
        ...(request.body === undefined
          ? {}
          : { body: JSON.stringify(request.body) }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new YunQiApiError(
          response.status,
          payload as ApiErrorResponse,
        );
      }

      return payload as T;
    },
  };
}

export function createAxiosTransport(axios: AxiosLike): YunQiTransport {
  return {
    async request<T>(request: TransportRequest): Promise<T> {
      const response = await axios.request<T>({
        method: request.method,
        url: request.path,
        data: request.body,
      });
      return response.data;
    },
  };
}

export function createYunQiClient(
  transport: YunQiTransport,
): YunQiClient {
  return {
    async getYear(year) {
      const response = await transport.request<YearSuccessResponse>({
        method: 'GET',
        path: '/api/v1/yunqi/year/' + encodeURIComponent(String(year)),
      });
      return response.data;
    },
    async getCurrent() {
      const response =
        await transport.request<CalculationSuccessResponse>({
          method: 'GET',
          path: '/api/v1/yunqi/current',
        });
      return response.data;
    },
    async calculate(request) {
      const response =
        await transport.request<CalculationSuccessResponse>({
          method: 'POST',
          path: '/api/v1/yunqi/calculate',
          body: request,
        });
      return response.data;
    },
  };
}

export const yunqiClient = createYunQiClient(
  createFetchTransport({ baseUrl: '' }),
);

export const yunqiQueryOptions = {
  year(year: number, client: YunQiClient = yunqiClient) {
    return {
      queryKey: ['yunqi', 'year', year] as const,
      queryFn: () => client.getYear(year),
    };
  },
  current(client: YunQiClient = yunqiClient) {
    return {
      queryKey: ['yunqi', 'current'] as const,
      queryFn: () => client.getCurrent(),
    };
  },
} as const;
