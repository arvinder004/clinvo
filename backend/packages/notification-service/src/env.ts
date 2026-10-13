import { z } from 'zod';

const envSchema = z.object({
  INTERNAL_SERVICE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().default(''),
  EMAIL_FROM: z.string().default('Clinvo <noreply@clinvo.in>'),
  PORT: z.coerce.number().default(3003),
  NODE_ENV: z.string().default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
