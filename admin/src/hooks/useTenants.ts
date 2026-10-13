import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Tenant {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string | null;
  createdAt: string;
}

export function useTenants(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['tenants', { page, pageSize }],
    queryFn: async () => {
      const res = await api.get('/v1/admin/tenants', { params: { page, pageSize } });
      return res.data as { data: Tenant[]; total: number; page: number; pageSize: number };
    },
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; ownerName: string; ownerEmail: string; ownerPhone?: string }) => {
      const res = await api.post<Tenant>('/v1/admin/tenants', body);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}
