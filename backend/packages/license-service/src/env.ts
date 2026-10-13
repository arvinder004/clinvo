import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_SECRET_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRY: z.string().default('8h'),
  INTERNAL_SERVICE_KEY: z.string().min(1),
  NOTIFY_SERVICE_URL: z.string().default('http://localhost:3003'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.string().default('development'),
  ADMIN_PASSWORD_HASH: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
