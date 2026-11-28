/** Only live service-clock queries catch up after an inactive desktop panel is revealed. */
export const liveClockQueryOptions = {
  staleTime: 0,
  refetchInterval: 60_000,
  meta: { liveClock: true },
} as const;
