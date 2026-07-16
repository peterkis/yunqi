import {
  createAxiosTransport,
  createYunQiClient,
  yunqiQueryOptions,
  type AxiosLike,
} from '../src/contracts/yunqi-api.js';
import type {
  CalculateRequest,
  YunQiCalculationDto,
  YunQiYearDto,
} from '../src/contracts/yunqi-types.js';

declare const axios: AxiosLike;
const client = createYunQiClient(createAxiosTransport(axios));
const annual: Promise<YunQiYearDto> = client.getYear(2024);
const current: Promise<YunQiCalculationDto> = client.getCurrent();
const request: CalculateRequest = { dateTime: '2024-05-20T21:00:00' };
const calculated: Promise<YunQiCalculationDto> = client.calculate(request);
const yearKey: readonly ['yunqi', 'year', number] =
  yunqiQueryOptions.year(2024, client).queryKey;
const currentKey: readonly ['yunqi', 'current'] =
  yunqiQueryOptions.current(client).queryKey;
void { annual, current, calculated, yearKey, currentKey };

// @ts-expect-error calculate requires dateTime.
void client.calculate({});
// @ts-expect-error calculate accepts only the generated request shape.
void client.calculate({ dateTime: '2024-05-20T21:00:00', diagnosis: '风寒' });
// @ts-expect-error getYear requires a number.
void client.getYear('2024');
