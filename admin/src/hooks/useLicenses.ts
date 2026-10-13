import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface License {
  id: string;
  tenantId: string;
  planId: string;
  apiKeyHash: string;
  apiKeyPrefix: string;
  status: 'active' | 'paused' | 'expired' | 'cancelled';
  expiresAt: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  notes: string | null;
}

export interface LicenseWithNames extends License {
  tenantName: string;
  planName: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface LicenseFilters {
  page?: number;
  pageSize?: number;
  status?: string;
}

export function useLicenses(filters: LicenseFilters = {}) {
  return useQuery({
    queryKey: ['licenses', filters],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<LicenseWithNames>>('/v1/admin/licenses', {
        params: filters,
      });
      return res.data;
    },
  });
}

export function useLicense(id: string) {
  return useQuery({
    queryKey: ['license', id],
    queryFn: async () => {
      const res = await api.get(`/v1/admin/licenses/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useIssueLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      tenantId: string;
      planId: string;
      expiresAt: string;
      notes?: string;
      env?: 'live' | 'test';
    }) => {
      const res = await api.post<{ license: License; apiKey: string }>('/v1/keys/issue', body);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['licenses'] });
    },
  });
}

export function useUpdateLicenseStatus(licenseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (status: string) => {
      const res = await api.patch(`/v1/admin/licenses/${licenseId}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['license', licenseId] });
      void qc.invalidateQueries({ queryKey: ['licenses'] });
    },
  });
}

export function useUpdateLicenseFeatures(licenseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (features: Record<string, string>) => {
      const res = await api.patch(`/v1/admin/licenses/${licenseId}/features`, { features });
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['license', licenseId] });
    },
  });
}

export function useUpdateLicenseExpiry(licenseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (expiresAt: string) => {
      const res = await api.patch(`/v1/admin/licenses/${licenseId}/expiry`, { expiresAt });
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['license', licenseId] });
    },
  });
}
