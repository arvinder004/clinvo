import { z } from 'zod';
import bcrypt from 'bcryptjs';

// Default bcrypt hash for password 'ClinvoAdmin#2026!'
const DEFAULT_ADMIN_HASH = '$2a$10$sa6jtCrKJNq5pQRmpEV1xuu4GoHb0aEtJ4KNVJ3Am9HekBkxAExPu';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_SECRET_KEY: z.string().default('clinvo_master_admin_secret_key_2026'),
  JWT_SECRET: z.string().default('clinvo_jwt_master_secret_2026_super_secure'),
  JWT_EXPIRY: z.string().default('8h'),
  INTERNAL_SERVICE_KEY: z.string().default('clinvo_internal_shared_secret_99'),
  NOTIFY_SERVICE_URL: z.string().default('http://localhost:3003'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.string().default('development'),
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD_HASH: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const rawData = parsed.data;

let adminPasswordHash = rawData.ADMIN_PASSWORD_HASH;
if (!adminPasswordHash && rawData.ADMIN_PASSWORD) {
  adminPasswordHash = bcrypt.hashSync(rawData.ADMIN_PASSWORD, 10);
}
if (!adminPasswordHash) {
  adminPasswordHash = DEFAULT_ADMIN_HASH;
}

export const env = {
  ...rawData,
  ADMIN_PASSWORD_HASH: adminPasswordHash,
};
