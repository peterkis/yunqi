import { useMutation } from '@tanstack/react-query';
import type { CalculateRequest } from '@yunqi/contracts';
import { useYunQiClient } from '../../../providers/YunQiClientProvider';

export function useCalculateYunQiMutation() {
  const client = useYunQiClient();

  return useMutation({
    mutationFn: (request: CalculateRequest) =>
      client.calculate(request),
  });
}
