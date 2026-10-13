import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual, createHash } from 'node:crypto';
import { env } from '../env.js';

export function internalAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-internal-key'];
  if (typeof key !== 'string') {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Internal key required' } });
    return;
  }

  const aHash = createHash('sha256').update(key).digest();
  const bHash = createHash('sha256').update(env.INTERNAL_SERVICE_KEY).digest();

  if (!timingSafeEqual(aHash, bHash)) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid internal key' } });
    return;
  }

  next();
}
