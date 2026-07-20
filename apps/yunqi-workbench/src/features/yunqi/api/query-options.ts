import { queryOptions } from '@tanstack/react-query';
import {
  yunqiQueryOptions,
  type YunQiClient,
} from '@yunqi/client';

export function currentYunQiQueryOptions(client: YunQiClient) {
  return queryOptions(yunqiQueryOptions.current(client));
}

export function yunQiYearQueryOptions(
  year: number,
  client: YunQiClient,
) {
  return queryOptions(yunqiQueryOptions.year(year, client));
}
