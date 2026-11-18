import { useMutation, useQuery } from '@tanstack/react-query';
import type { BirthComparisonRequest } from '@yunqi/contracts';
import { useYunQiClient } from '../../../providers/YunQiClientProvider';
import { useSessionVisible } from '../../../components/layout/SessionVisibility';

export function useLearningCurrentQuery() {
  const client = useYunQiClient();
  const visible = useSessionVisible();
  return useQuery({
    queryKey: ['yunqi', 'learning', 'current'],
    queryFn: () => client.getLearningCurrent(),
    // The service owns the clock. Refresh a visible current view so a long
    // consultation does not leave yesterday's stage on screen.
    staleTime: 0,
    enabled: visible,
    refetchInterval: visible ? 60_000 : false,
  });
}

export function useBirthComparisonMutation() {
  const client = useYunQiClient();
  return useMutation({
    mutationFn: (request: BirthComparisonRequest) => client.compareBirth(request),
    gcTime: 0,
  });
}
