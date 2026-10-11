export type LicenseStatus = 'active' | 'paused' | 'expired' | 'cancelled';

export interface Tenant {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string | null;
  createdAt: Date;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceInr: number;
  isActive: boolean;
}

export interface PlanFeature {
  planId: string;
  featureKey: string;
  value: string;
}

export interface License {
  id: string;
  tenantId: string;
  planId: string;
  apiKeyHash: string;
  apiKeyPrefix: string;
  status: LicenseStatus;
  expiresAt: Date | null;
  createdAt: Date;
  lastSeenAt: Date | null;
  notes: string | null;
}

export interface LicenseFeatureOverride {
  licenseId: string;
  featureKey: string;
  value: string;
}

export interface LicenseEvent {
  id: string;
  licenseId: string;
  eventType: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface VerifyKeyResponse {
  valid: boolean;
  status: LicenseStatus | null;
  plan: string | null;
  tenantId: string | null;
  expiresAt: string | null;
  features: Record<string, string>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
