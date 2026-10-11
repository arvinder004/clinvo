import { z } from 'zod';

export const CreateTenantBody = z.object({
  name: z.string().min(1),
  ownerName: z.string().min(1),
  ownerEmail: z.string().email(),
  ownerPhone: z.string().optional(),
});

export type CreateTenantBodyType = z.infer<typeof CreateTenantBody>;
