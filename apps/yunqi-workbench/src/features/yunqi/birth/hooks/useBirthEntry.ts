import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { BirthDatePreviewDto, BirthDatePreviewRequest, BirthYearRequest } from '@yunqi/contracts';
import { useYunQiClient } from '../../../../providers/YunQiClientProvider';
import { currentYunQiQueryOptions } from '../../api/query-options';

export function useBirthReferenceDate() {
  const client = useYunQiClient();
  const query = useQuery({ ...currentYunQiQueryOptions(client), staleTime: 0, refetchInterval: 60_000 });
  const local = query.data?.input.localTime;
  const today = local ? { year: Number(local.slice(0, 4)), month: Number(local.slice(5, 7)), day: Number(local.slice(8, 10)) } : undefined;
  return { today, failed: query.isError, retry: query.refetch };
}

export function useBirthYearComparison() {
  const client = useYunQiClient();
  return useMutation({ mutationFn: (request: BirthYearRequest) => client.compareBirthYear(request), gcTime: 0 });
}

export function useBirthPreview(request: BirthDatePreviewRequest | undefined) {
  const client = useYunQiClient();
  const [result, setResult] = useState<{ request: BirthDatePreviewRequest; matches?: BirthDatePreviewDto['matches']; failed?: boolean }>();
  const [attempt, retry] = useState(0);
  useEffect(() => {
    setResult(undefined);
    if (!request) return;
    let active = true;
    const timer = setTimeout(() => {
      client.previewBirthDate(request).then(
        ({ matches }) => { if (active) setResult({ request, matches }); },
        () => { if (active) setResult({ request, failed: true }); },
      );
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [client, request, attempt]);
  return { ...(result?.request === request ? result : undefined), retry: () => retry(value => value + 1) };
}
