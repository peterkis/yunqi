import { useQuery } from '@tanstack/react-query';
import { useYunQiClient } from '../../../providers/YunQiClientProvider';
import { currentYunQiQueryOptions } from '../api/query-options';

export function useCurrentYunQiQuery() {
  const client = useYunQiClient();

  return useQuery(currentYunQiQueryOptions(client));
}
