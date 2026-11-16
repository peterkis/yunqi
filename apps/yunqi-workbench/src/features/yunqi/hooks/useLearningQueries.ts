import { useMutation, useQuery } from '@tanstack/react-query';
import type { BirthComparisonRequest } from '@yunqi/contracts';
import { useYunQiClient } from '../../../providers/YunQiClientProvider';

export function useLearningCurrentQuery() {
  const client = useYunQiClient();
  return useQuery({
    queryKey: ['yunqi', 'learning', 'current'],
    queryFn: () => client.getLearningCurrent(),
    // The service owns the clock. Refresh a visible current view so a long
    // consultation does not leave yesterday's stage on screen.
    staleTime: 0,
    refetchInterval: 60_000,
  });
}

export function useBirthComparisonMutation() {
  const client = useYunQiClient();
  return useMutation({
    mutationFn: (request: BirthComparisonRequest) => client.compareBirth(request),
    gcTime: 0,
  });
}
