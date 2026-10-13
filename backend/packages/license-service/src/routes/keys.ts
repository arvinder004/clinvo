import { Router } from 'express';
import type { Db } from '@clinvo/shared';
import { IssueLicenseBody, UpdateLicenseStatusBody } from '@clinvo/shared';
import { adminAuth } from '../middleware/adminAuth.js';
import { createBearerAuth } from '../middleware/bearerAuth.js';
import { verifyRateLimiter } from '../middleware/rateLimiter.js';
import * as licenseService from '../services/licenseService.js';
import * as notifyClient from '../services/notifyClient.js';
import { AppError } from '../middleware/errorHandler.js';

export function keysRouter(db: Db): Router {
  const router = Router();
  const bearerAuth = createBearerAuth(db);

  // POST /v1/keys/issue
  router.post('/issue', adminAuth, async (req, res, next) => {
    try {
      const parsed = IssueLicenseBody.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body'));
      }

      const { license, rawKey } = await licenseService.issueKey(db, parsed.data);

      // Fire-and-forget email notification
      void notifyClient.sendKeyIssuedEmail(license.id, '', rawKey);

      res.status(201).json({ license, apiKey: rawKey });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/keys/verify
  router.get('/verify', verifyRateLimiter, bearerAuth, async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization!;
      const token = authHeader.slice(7);
      const { hashApiKey } = await import('@clinvo/shared');
      const keyHash = hashApiKey(token);
      const result = await licenseService.verifyKey(db, keyHash);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // PATCH /v1/keys/:licenseId/status
  router.patch('/:licenseId/status', adminAuth, async (req, res, next) => {
    try {
      const parsed = UpdateLicenseStatusBody.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body'));
      }
      const license = await licenseService.updateStatus(db, req.params['licenseId'] as string, parsed.data.status);
      res.json({ license });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
