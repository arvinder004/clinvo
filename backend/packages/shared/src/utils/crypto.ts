import { createHash, randomBytes } from 'node:crypto';

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(env: 'live' | 'test'): string {
  const hex = randomBytes(16).toString('hex'); // 32 hex chars
  return `clnv_${env}_${hex}`;
}
