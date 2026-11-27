import { useMutation, useQuery } from '@tanstack/react-query';
import type { BirthComparisonRequest } from '@yunqi/contracts';
import { useYunQiClient } from '../../../providers/YunQiClientProvider';
import { liveClockQueryOptions } from '../../../lib/live-clock-query';
import { useSessionVisible } from '../../../components/layout/SessionVisibility';

export function useLearningCurrentQuery(enabled = true) {
  const client = useYunQiClient();
  const visible = useSessionVisible();
  return useQuery({
    queryKey: ['yunqi', 'learning', 'current'],
    queryFn: () => client.getLearningCurrent(),
    // The service owns the clock. Refresh a visible current view so a long
    // consultation does not leave yesterday's stage on screen.
    ...liveClockQueryOptions,
    enabled: visible && enabled,
  });
}

export function useBirthComparisonMutation() {
  const client = useYunQiClient();
  return useMutation({
    mutationFn: (request: BirthComparisonRequest) => client.compareBirth(request),
    gcTime: 0,
  });
}
