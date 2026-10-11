import { z } from 'zod';

export const IssueLicenseBody = z.object({
  tenantId: z.string().uuid(),
  planId: z.string().uuid(),
  expiresAt: z.string().datetime({ offset: true }),
  notes: z.string().optional(),
  env: z.enum(['live', 'test']).default('live'),
});

export const UpdateLicenseStatusBody = z.object({
  status: z.enum(['active', 'paused', 'expired', 'cancelled']),
});

export const UpdateLicenseExpiryBody = z.object({
  expiresAt: z.string().datetime({ offset: true }),
});

export const UpdateLicenseFeaturesBody = z.object({
  features: z.record(z.string(), z.string()),
});

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type IssueLicenseBodyType = z.infer<typeof IssueLicenseBody>;
export type UpdateLicenseStatusBodyType = z.infer<typeof UpdateLicenseStatusBody>;
export type UpdateLicenseExpiryBodyType = z.infer<typeof UpdateLicenseExpiryBody>;
export type UpdateLicenseFeaturesBodyType = z.infer<typeof UpdateLicenseFeaturesBody>;
export type PaginationQueryType = z.infer<typeof PaginationQuerySchema>;
