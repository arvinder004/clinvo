import { Request, Response, NextFunction } from 'express';
import { hashApiKey, licenses, eq, and, gt, type Db } from '@clinvo/shared';
import { AppError } from './errorHandler.js';

export function createBearerAuth(db: Db) {
  return async function bearerAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      next(new AppError(401, 'KEY_INVALID', 'Bearer token required'));
      return;
    }

    const token = authHeader.slice(7);
    const keyHash = hashApiKey(token);

    try {
      const rows = await db
        .select({
          id: licenses.id,
          tenantId: licenses.tenantId,
          planId: licenses.planId,
          status: licenses.status,
          expiresAt: licenses.expiresAt,
        })
        .from(licenses)
        .where(eq(licenses.apiKeyHash, keyHash))
        .limit(1);

      const license = rows[0];

      if (!license) {
        next(new AppError(401, 'KEY_INVALID', 'Invalid API key'));
        return;
      }

      if (license.status === 'paused') {
        next(new AppError(401, 'KEY_PAUSED', 'License is paused'));
        return;
      }

      if (license.status !== 'active') {
        next(new AppError(401, 'KEY_INVALID', 'License is not active'));
        return;
      }

      if (license.expiresAt && license.expiresAt <= new Date()) {
        next(new AppError(401, 'KEY_EXPIRED', 'License has expired'));
        return;
      }

      req.licenseId = license.id;
      req.tenantId = license.tenantId;
      req.planId = license.planId;
      next();
    } catch (err) {
      next(err);
    }
  };
}
