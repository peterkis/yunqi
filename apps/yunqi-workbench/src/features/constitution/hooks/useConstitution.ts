import { useMutation, useQuery } from '@tanstack/react-query';
import type { ConstitutionRequest } from '@yunqi/contracts';
import { useYunQiClient } from '../../../providers/YunQiClientProvider';

export function useConstitutionQuestionnaire() {
  const client = useYunQiClient();
  return useQuery({
    queryKey: ['constitution', 'questionnaire'],
    queryFn: () => client.getConstitutionQuestionnaire(),
  });
}

export function useConstitutionAssessment() {
  const client = useYunQiClient();
  return useMutation({
    mutationFn: (request: ConstitutionRequest) => client.assessConstitution(request),
    gcTime: 0,
  });
}
