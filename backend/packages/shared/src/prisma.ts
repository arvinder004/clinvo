import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __clinvo_prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__clinvo_prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__clinvo_prisma = prisma;
}

export * from '@prisma/client';
