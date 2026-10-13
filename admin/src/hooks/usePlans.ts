import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceInr: number;
  isActive: boolean;
  features: Record<string, string>;
}

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await api.get<Plan[]>('/v1/admin/plans');
      return res.data;
    },
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      description?: string;
      priceInr: number;
      features: Record<string, string>;
    }) => {
      const res = await api.post<Plan>('/v1/admin/plans', body);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}
