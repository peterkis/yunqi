import { useQuery } from '@tanstack/react-query';
import { useYunQiClient } from '../../../providers/YunQiClientProvider';
import { yunQiYearQueryOptions } from '../api/query-options';

export function useYunQiYearQuery(year: number) {
  const client = useYunQiClient();

  return useQuery(yunQiYearQueryOptions(year, client));
}
