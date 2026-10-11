import { z } from 'zod';

export const CreatePlanBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  priceInr: z.number().nonnegative(),
  features: z.record(z.string(), z.string()),
});

export type CreatePlanBodyType = z.infer<typeof CreatePlanBody>;
