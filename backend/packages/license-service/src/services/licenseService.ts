import {
  Db,
  License,
  LicenseStatus,
  PaginatedResponse,
  Plan,
  Tenant,
  VerifyKeyResponse,
  generateApiKey,
  hashApiKey,
  licenses,
  licenseEvents,
  licenseFeatureOverrides,
  planFeatures,
  plans,
  tenants,
  IssueLicenseBodyType,
  CreateTenantBodyType,
  CreatePlanBodyType,
  eq, lt, and, sql, desc,
} from '@clinvo/shared';
import { AppError } from '../middleware/errorHandler.js';

// ─── Issue ───────────────────────────────────────────────────────────────────

export async function issueKey(
  db: Db,
  body: IssueLicenseBodyType,
): Promise<{ license: License; rawKey: string }> {
  const rawKey = generateApiKey(body.env);
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 14); // e.g. "clnv_live_xxxx"

  const [license] = await db
    .insert(licenses)
    .values({
      tenantId: body.tenantId,
      planId: body.planId,
      apiKeyHash: keyHash,
      apiKeyPrefix: keyPrefix,
      status: 'active',
      expiresAt: new Date(body.expiresAt),
      notes: body.notes ?? null,
    })
    .returning();

  if (!license) throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Failed to create license');

  await db.insert(licenseEvents).values({
    licenseId: license.id,
    eventType: 'issued',
    metadata: { tenantId: body.tenantId, planId: body.planId },
  });

  return { license: drizzleLicenseToLicense(license), rawKey };
}

// ─── Verify ──────────────────────────────────────────────────────────────────

export async function verifyKey(db: Db, keyHash: string): Promise<VerifyKeyResponse> {
  const rows = await db
    .select({
      licenseId: licenses.id,
      tenantId: licenses.tenantId,
      planId: licenses.planId,
      status: licenses.status,
      expiresAt: licenses.expiresAt,
      lastSeenAt: licenses.lastSeenAt,
      planName: plans.name,
      featureKey: planFeatures.featureKey,
      featureValue: planFeatures.value,
      overrideKey: licenseFeatureOverrides.featureKey,
      overrideValue: licenseFeatureOverrides.value,
    })
    .from(licenses)
    .innerJoin(plans, eq(licenses.planId, plans.id))
    .leftJoin(planFeatures, eq(plans.id, planFeatures.planId))
    .leftJoin(
      licenseFeatureOverrides,
      eq(licenses.id, licenseFeatureOverrides.licenseId),
    )
    .where(eq(licenses.apiKeyHash, keyHash));

  if (rows.length === 0) {
    return { valid: false, status: null, plan: null, tenantId: null, expiresAt: null, features: {} };
  }

  const first = rows[0]!;

  // Build features map: plan features, then apply overrides
  const featuresMap: Record<string, string> = {};
  for (const row of rows) {
    if (row.featureKey && row.featureValue) {
      featuresMap[row.featureKey] = row.featureValue;
    }
  }
  // Apply per-license overrides
  for (const row of rows) {
    if (row.overrideKey && row.overrideValue) {
      featuresMap[row.overrideKey] = row.overrideValue;
    }
  }

  const now = new Date();
  const isValid = first.status === 'active' && (!first.expiresAt || first.expiresAt > now);

  // Update last_seen_at
  await db
    .update(licenses)
    .set({ lastSeenAt: now })
    .where(eq(licenses.apiKeyHash, keyHash));

  // Log 'verified' event only if last_seen_at was >1h ago (avoid spam)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  if (!first.lastSeenAt || first.lastSeenAt < oneHourAgo) {
    await db.insert(licenseEvents).values({
      licenseId: first.licenseId,
      eventType: 'verified',
      metadata: { timestamp: now.toISOString() },
    });
  }

  return {
    valid: isValid,
    status: first.status,
    plan: first.planName,
    tenantId: first.tenantId,
    expiresAt: first.expiresAt ? first.expiresAt.toISOString() : null,
    features: featuresMap,
  };
}

// ─── Update status ────────────────────────────────────────────────────────────

export async function updateStatus(
  db: Db,
  licenseId: string,
  status: LicenseStatus,
): Promise<License> {
  const [updated] = await db
    .update(licenses)
    .set({ status })
    .where(eq(licenses.id, licenseId))
    .returning();

  if (!updated) throw new AppError(404, 'NOT_FOUND', 'License not found');

  await db.insert(licenseEvents).values({
    licenseId,
    eventType: 'status_changed',
    metadata: { status },
  });

  return drizzleLicenseToLicense(updated);
}

// ─── List licenses ────────────────────────────────────────────────────────────

export async function listLicenses(
  db: Db,
  pagination: { page: number; pageSize: number },
): Promise<PaginatedResponse<License & { tenantName: string; planName: string }>> {
  const { page, pageSize } = pagination;
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: licenses.id,
      tenantId: licenses.tenantId,
      planId: licenses.planId,
      apiKeyHash: licenses.apiKeyHash,
      apiKeyPrefix: licenses.apiKeyPrefix,
      status: licenses.status,
      expiresAt: licenses.expiresAt,
      createdAt: licenses.createdAt,
      lastSeenAt: licenses.lastSeenAt,
      notes: licenses.notes,
      tenantName: tenants.name,
      planName: plans.name,
    })
    .from(licenses)
    .innerJoin(tenants, eq(licenses.tenantId, tenants.id))
    .innerJoin(plans, eq(licenses.planId, plans.id))
    .orderBy(desc(licenses.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(licenses);

  const total = countResult?.count ?? 0;

  return {
    data: rows.map((r) => ({
      ...drizzleLicenseToLicense(r),
      tenantName: r.tenantName,
      planName: r.planName,
    })),
    total,
    page,
    pageSize,
  };
}

// ─── Get license ──────────────────────────────────────────────────────────────

export async function getLicense(
  db: Db,
  licenseId: string,
): Promise<License & { tenant: Tenant; plan: Plan; overrides: Record<string, string>; events: unknown[] }> {
  const licenseRows = await db
    .select()
    .from(licenses)
    .where(eq(licenses.id, licenseId))
    .limit(1);

  const license = licenseRows[0];
  if (!license) throw new AppError(404, 'NOT_FOUND', 'License not found');

  const [tenantRow] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, license.tenantId))
    .limit(1);

  const [planRow] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, license.planId))
    .limit(1);

  const overrideRows = await db
    .select()
    .from(licenseFeatureOverrides)
    .where(eq(licenseFeatureOverrides.licenseId, licenseId));

  const eventRows = await db
    .select()
    .from(licenseEvents)
    .where(eq(licenseEvents.licenseId, licenseId))
    .orderBy(desc(licenseEvents.createdAt))
    .limit(50);

  const overrides: Record<string, string> = {};
  for (const row of overrideRows) {
    overrides[row.featureKey] = row.value;
  }

  return {
    ...drizzleLicenseToLicense(license),
    tenant: tenantRow!,
    plan: planRow!,
    overrides,
    events: eventRows,
  };
}

// ─── Update features ──────────────────────────────────────────────────────────

export async function updateFeatures(
  db: Db,
  licenseId: string,
  features: Record<string, string>,
): Promise<void> {
  // Verify license exists
  const rows = await db
    .select({ id: licenses.id })
    .from(licenses)
    .where(eq(licenses.id, licenseId))
    .limit(1);

  if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'License not found');

  // Upsert each feature override
  for (const [featureKey, value] of Object.entries(features)) {
    await db
      .insert(licenseFeatureOverrides)
      .values({ licenseId, featureKey, value })
      .onConflictDoUpdate({
        target: [licenseFeatureOverrides.licenseId, licenseFeatureOverrides.featureKey],
        set: { value },
      });
  }

  await db.insert(licenseEvents).values({
    licenseId,
    eventType: 'features_updated',
    metadata: { features },
  });
}

// ─── Update expiry ────────────────────────────────────────────────────────────

export async function updateExpiry(
  db: Db,
  licenseId: string,
  expiresAt: string,
): Promise<License> {
  const [updated] = await db
    .update(licenses)
    .set({ expiresAt: new Date(expiresAt) })
    .where(eq(licenses.id, licenseId))
    .returning();

  if (!updated) throw new AppError(404, 'NOT_FOUND', 'License not found');

  await db.insert(licenseEvents).values({
    licenseId,
    eventType: 'expiry_updated',
    metadata: { expiresAt },
  });

  return drizzleLicenseToLicense(updated);
}

// ─── Tenant CRUD ──────────────────────────────────────────────────────────────

export async function createTenant(db: Db, body: CreateTenantBodyType): Promise<Tenant> {
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: body.name,
      ownerName: body.ownerName,
      ownerEmail: body.ownerEmail,
      ownerPhone: body.ownerPhone ?? null,
    })
    .returning();

  if (!tenant) throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Failed to create tenant');
  return tenant;
}

export async function listTenants(
  db: Db,
  pagination: { page: number; pageSize: number },
): Promise<PaginatedResponse<Tenant>> {
  const { page, pageSize } = pagination;
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select()
    .from(tenants)
    .orderBy(desc(tenants.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tenants);

  const total = countResult?.count ?? 0;

  return { data: rows, total, page, pageSize };
}

// ─── Plan CRUD ────────────────────────────────────────────────────────────────

export async function createPlan(
  db: Db,
  body: CreatePlanBodyType,
): Promise<Plan & { features: Record<string, string> }> {
  const [plan] = await db
    .insert(plans)
    .values({
      name: body.name,
      description: body.description ?? null,
      priceInr: body.priceInr,
    })
    .returning();

  if (!plan) throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Failed to create plan');

  for (const [featureKey, value] of Object.entries(body.features)) {
    await db.insert(planFeatures).values({ planId: plan.id, featureKey, value: String(value) });
  }

  return { ...plan, features: body.features };
}

export async function listPlans(
  db: Db,
): Promise<Array<Plan & { features: Record<string, string> }>> {
  const rows = await db
    .select({
      id: plans.id,
      name: plans.name,
      description: plans.description,
      priceInr: plans.priceInr,
      isActive: plans.isActive,
      featureKey: planFeatures.featureKey,
      featureValue: planFeatures.value,
    })
    .from(plans)
    .leftJoin(planFeatures, eq(plans.id, planFeatures.planId))
    .where(eq(plans.isActive, true));

  // Group by plan
  const planMap = new Map<string, Plan & { features: Record<string, string> }>();
  for (const row of rows) {
    if (!planMap.has(row.id)) {
      planMap.set(row.id, {
        id: row.id,
        name: row.name,
        description: row.description,
        priceInr: row.priceInr,
        isActive: row.isActive,
        features: {},
      });
    }
    if (row.featureKey && row.featureValue) {
      planMap.get(row.id)!.features[row.featureKey] = row.featureValue;
    }
  }

  return Array.from(planMap.values());
}

// ─── Expire overdue licenses ──────────────────────────────────────────────────

export interface ExpiredLicenseInfo {
  licenseId: string;
  tenantEmail: string;
}

export async function expireOverdueLicenses(db: Db): Promise<ExpiredLicenseInfo[]> {
  const now = new Date();

  // Find active licenses that are past their expiry
  const overdue = await db
    .select({
      licenseId: licenses.id,
      tenantId: licenses.tenantId,
      tenantEmail: tenants.ownerEmail,
    })
    .from(licenses)
    .innerJoin(tenants, eq(licenses.tenantId, tenants.id))
    .where(and(eq(licenses.status, 'active'), lt(licenses.expiresAt, now)));

  if (overdue.length === 0) return [];

  const ids = overdue.map((r) => r.licenseId);

  // Batch update to expired
  for (const licenseId of ids) {
    await db
      .update(licenses)
      .set({ status: 'expired' })
      .where(eq(licenses.id, licenseId));

    await db.insert(licenseEvents).values({
      licenseId,
      eventType: 'expired',
      metadata: { expiredAt: now.toISOString(), reason: 'cron_job' },
    });
  }

  return overdue.map((r) => ({
    licenseId: r.licenseId,
    tenantEmail: r.tenantEmail,
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function drizzleLicenseToLicense(row: {
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
}): License {
  return {
    id: row.id,
    tenantId: row.tenantId,
    planId: row.planId,
    apiKeyHash: row.apiKeyHash,
    apiKeyPrefix: row.apiKeyPrefix,
    status: row.status,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
    notes: row.notes,
  };
}
