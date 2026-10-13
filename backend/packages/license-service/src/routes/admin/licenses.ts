import { Router } from 'express';
import type { Db } from '@clinvo/shared';
import {
  UpdateLicenseStatusBody,
  UpdateLicenseFeaturesBody,
  UpdateLicenseExpiryBody,
  PaginationQuerySchema,
} from '@clinvo/shared';
import { adminAuth } from '../../middleware/adminAuth.js';
import * as licenseService from '../../services/licenseService.js';
import { AppError } from '../../middleware/errorHandler.js';

export function licensesAdminRouter(db: Db): Router {
  const router = Router();

  // GET /v1/admin/licenses
  router.get('/', adminAuth, async (req, res, next) => {
    try {
      const pagination = PaginationQuerySchema.parse(req.query);
      const result = await licenseService.listLicenses(db, pagination);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/admin/licenses/:licenseId
  router.get('/:licenseId', adminAuth, async (req, res, next) => {
    try {
      const license = await licenseService.getLicense(db, req.params['licenseId'] as string);
      res.json(license);
    } catch (err) {
      next(err);
    }
  });

  // PATCH /v1/admin/licenses/:licenseId/status
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

  // PATCH /v1/admin/licenses/:licenseId/features
  router.patch('/:licenseId/features', adminAuth, async (req, res, next) => {
    try {
      const parsed = UpdateLicenseFeaturesBody.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body'));
      }
      await licenseService.updateFeatures(db, req.params['licenseId'] as string, parsed.data.features);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /v1/admin/licenses/:licenseId/expiry
  router.patch('/:licenseId/expiry', adminAuth, async (req, res, next) => {
    try {
      const parsed = UpdateLicenseExpiryBody.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body'));
      }
      const license = await licenseService.updateExpiry(db, req.params['licenseId'] as string, parsed.data.expiresAt);
      res.json({ license });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
