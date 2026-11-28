import type {
  ApiErrorResponse,
  CalculateRequest,
  CalculationSuccessResponse,
  YearSuccessResponse,
  YunQiCalculationDto,
  YunQiYearDto,
  YunQiLearningDto,
  LearningSuccessResponse,
  BirthComparisonRequest,
  BirthComparisonDto,
  BirthSuccessResponse, BirthYearRequest, BirthDatePreviewRequest, BirthYearComparisonDto,
  BirthDatePreviewDto, BirthYearSuccessResponse, BirthDatePreviewSuccessResponse,
  ConstitutionQuestionnaireDto,
  ConstitutionRequest,
  ConstitutionAssessmentDto,
  QuestionnaireSuccessResponse,
  AssessmentSuccessResponse,
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
  getLearningCurrent(): Promise<YunQiLearningDto>;
  calculateLearning(request: CalculateRequest): Promise<YunQiLearningDto>;
  previewBirthDate(request: BirthDatePreviewRequest): Promise<BirthDatePreviewDto>;
  compareBirthYear(request: BirthYearRequest): Promise<BirthYearComparisonDto>;
  compareBirth(request: BirthComparisonRequest): Promise<BirthComparisonDto>;
  getConstitutionQuestionnaire(): Promise<ConstitutionQuestionnaireDto>;
  assessConstitution(request: ConstitutionRequest): Promise<ConstitutionAssessmentDto>;
}

export interface FetchTransportOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
}

const currentYunQiPath = '/api/v1/yunqi/current';

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
        // This endpoint is also used to validate the Beijing date just before submitting.
        ...(request.method === 'GET' && request.path === currentYunQiPath ? { cache: 'no-store' as const } : {}),
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
          path: currentYunQiPath,
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
    async getLearningCurrent() {
      const response = await transport.request<LearningSuccessResponse>({ method: 'GET', path: '/api/v1/yunqi/learning/current' });
      return response.data;
    },
    async calculateLearning(request) {
      const response = await transport.request<LearningSuccessResponse>({ method: 'POST', path: '/api/v1/yunqi/learning/calculate', body: request });
      return response.data;
    },
    async previewBirthDate(request) {
      return (await transport.request<BirthDatePreviewSuccessResponse>({ method: 'POST', path: '/api/v1/yunqi/learning/birth-date-preview', body: request })).data;
    },
    async compareBirthYear(request) {
      return (await transport.request<BirthYearSuccessResponse>({ method: 'POST', path: '/api/v1/yunqi/learning/birth-year-comparison', body: request })).data;
    },
    async compareBirth(request) {
      const response = await transport.request<BirthSuccessResponse>({ method: 'POST', path: '/api/v1/yunqi/learning/birth-comparison', body: request });
      return response.data;
    },
    async getConstitutionQuestionnaire() {
      const response = await transport.request<QuestionnaireSuccessResponse>({ method: 'GET', path: '/api/v1/constitution/questionnaire' });
      return response.data;
    },
    async assessConstitution(request) {
      const response = await transport.request<AssessmentSuccessResponse>({ method: 'POST', path: '/api/v1/constitution/assess', body: request });
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
