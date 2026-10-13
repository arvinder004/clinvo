import { Router } from 'express';
import type { Db } from '@clinvo/shared';
import { CreatePlanBody } from '@clinvo/shared';
import { adminAuth } from '../../middleware/adminAuth.js';
import * as licenseService from '../../services/licenseService.js';
import { AppError } from '../../middleware/errorHandler.js';

export function plansAdminRouter(db: Db): Router {
  const router = Router();

  // GET /v1/admin/plans
  router.get('/', adminAuth, async (req, res, next) => {
    try {
      const plans = await licenseService.listPlans(db);
      res.json(plans);
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/admin/plans
  router.post('/', adminAuth, async (req, res, next) => {
    try {
      const parsed = CreatePlanBody.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body'));
      }
      const plan = await licenseService.createPlan(db, parsed.data);
      res.status(201).json(plan);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
