import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core';

// Enums
export const licenseStatusEnum = pgEnum('license_status', [
  'active',
  'paused',
  'expired',
  'cancelled',
]);

// Tables
export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  ownerName: varchar('owner_name', { length: 255 }).notNull(),
  ownerEmail: varchar('owner_email', { length: 255 }).notNull().unique(),
  ownerPhone: varchar('owner_phone', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  priceInr: integer('price_inr').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

export const planFeatures = pgTable(
  'plan_features',
  {
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    featureKey: varchar('feature_key', { length: 255 }).notNull(),
    value: text('value').notNull(),
  },
  (table) => [primaryKey({ columns: [table.planId, table.featureKey] })],
);

export const licenses = pgTable('licenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  planId: uuid('plan_id')
    .notNull()
    .references(() => plans.id, { onDelete: 'restrict' }),
  apiKeyHash: varchar('api_key_hash', { length: 64 }).notNull().unique(),
  apiKeyPrefix: varchar('api_key_prefix', { length: 20 }).notNull(),
  status: licenseStatusEnum('status').notNull().default('active'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  notes: text('notes'),
});

export const licenseFeatureOverrides = pgTable(
  'license_feature_overrides',
  {
    licenseId: uuid('license_id')
      .notNull()
      .references(() => licenses.id, { onDelete: 'cascade' }),
    featureKey: varchar('feature_key', { length: 255 }).notNull(),
    value: text('value').notNull(),
  },
  (table) => [primaryKey({ columns: [table.licenseId, table.featureKey] })],
);

export const licenseEvents = pgTable('license_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  licenseId: uuid('license_id')
    .notNull()
    .references(() => licenses.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
