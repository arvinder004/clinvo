import { z } from 'zod';

export const AdminLoginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type AdminLoginBodyType = z.infer<typeof AdminLoginBody>;
