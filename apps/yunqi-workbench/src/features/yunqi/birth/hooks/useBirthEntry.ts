import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { BirthDatePreviewDto, BirthDatePreviewRequest, BirthYearRequest, YunQiCalculationDto } from '@yunqi/contracts';
import { useYunQiClient } from '../../../../providers/YunQiClientProvider';
import { liveClockQueryOptions } from '../../../../lib/live-clock-query';
import { currentYunQiQueryOptions } from '../../api/query-options';

// Consume the backend's canonical Beijing date, without local clock conversion.
const referenceDate = (data: YunQiCalculationDto | undefined) => data?.input.localTime.slice(0, 10);

export function useBirthReferenceDate() {
  const client = useYunQiClient();
  const query = useQuery({ ...currentYunQiQueryOptions(client), ...liveClockQueryOptions });
  const localDate = referenceDate(query.data);
  const today = localDate ? { year: Number(localDate.slice(0, 4)), month: Number(localDate.slice(5, 7)), day: Number(localDate.slice(8, 10)) } : undefined;
  async function readFreshDate() {
    const result = await query.refetch({ throwOnError: true, cancelRefetch: true });
    return referenceDate(result.data);
  }
  return { today, localDate, failed: query.isError, retry: query.refetch, readFreshDate };
}

export function useBirthYearComparison() {
  const client = useYunQiClient();
  return useMutation({ mutationFn: (request: BirthYearRequest) => client.compareBirthYear(request), gcTime: 0 });
}

export function useBirthPreview(requests: readonly BirthDatePreviewRequest[] | undefined) {
  const client = useYunQiClient();
  const [result, setResult] = useState<{ client: typeof client; requests: readonly BirthDatePreviewRequest[]; attempt: number; matches?: BirthDatePreviewDto['matches']; failed?: boolean }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setResult(undefined);
    if (!requests) return;
    let active = true;
    const timer = setTimeout(() => {
      Promise.all(requests.map(request => client.previewBirthDate(request))).then(
        results => { if (active) setResult({ client, requests, attempt, matches: results.flatMap(({ matches }) => matches) }); },
        () => { if (active) setResult({ client, requests, attempt, failed: true }); },
      );
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [client, requests, attempt]);
  const active = result?.client === client && result.requests === requests && result.attempt === attempt ? result : undefined;
  return { matches: active?.matches, failed: active?.failed, retry: () => setAttempt(value => value + 1) };
}
