import { useLearningCurrentQuery } from '../hooks/useLearningQueries';
import type { YunQiLearningDto } from '@yunqi/contracts';
import { useMutation } from '@tanstack/react-query';

function snapshot({ facts }: YunQiLearningDto) {
  return { now: facts.input.localTime, year: facts.year, boundary: facts.interval.start.localTime };
}

/** Read the entry snapshot without starting a poll. Explicit “此刻” always refreshes it. */
export function useTimeAnchorSnapshot() {
  const query = useLearningCurrentQuery(false);
  const refresh = useMutation({
    mutationFn: async () => {
      const result = await query.refetch({ throwOnError: true });
      return snapshot(result.data!);
    },
  });
  return { cached: query.data && snapshot(query.data), refresh };
}
