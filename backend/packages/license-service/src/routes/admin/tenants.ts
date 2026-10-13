import { Router } from 'express';
import type { Db } from '@clinvo/shared';
import { CreateTenantBody, PaginationQuerySchema } from '@clinvo/shared';
import { adminAuth } from '../../middleware/adminAuth.js';
import * as licenseService from '../../services/licenseService.js';
import { AppError } from '../../middleware/errorHandler.js';

export function tenantsAdminRouter(db: Db): Router {
  const router = Router();

  // POST /v1/admin/tenants
  router.post('/', adminAuth, async (req, res, next) => {
    try {
      const parsed = CreateTenantBody.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body'));
      }
      const tenant = await licenseService.createTenant(db, parsed.data);
      res.status(201).json(tenant);
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/admin/tenants
  router.get('/', adminAuth, async (req, res, next) => {
    try {
      const pagination = PaginationQuerySchema.parse(req.query);
      const result = await licenseService.listTenants(db, pagination);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
