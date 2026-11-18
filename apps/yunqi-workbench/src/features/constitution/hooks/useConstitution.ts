import { useMutation, useQuery } from '@tanstack/react-query';
import type { ConstitutionRequest } from '@yunqi/contracts';
import { useYunQiClient } from '../../../providers/YunQiClientProvider';
import { mapAssessment } from '../presentation/map-constitution';
import { useSessionVisible } from '../../../components/layout/SessionVisibility';

export function useConstitutionQuestionnaire() {
  const client = useYunQiClient();
  const visible = useSessionVisible();
  return useQuery({
    queryKey: ['constitution', 'questionnaire'],
    queryFn: () => client.getConstitutionQuestionnaire(),
    enabled: visible,
  });
}

export function useConstitutionAssessment() {
  const client = useYunQiClient();
  const mutation = useMutation({
    mutationFn: (request: ConstitutionRequest) => client.assessConstitution(request),
    gcTime: 0,
  });
  return {
    result: mutation.isSuccess ? mapAssessment(mutation.data) : undefined,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
    submit: mutation.mutate,
  };
}
