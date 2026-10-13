import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AdminLoginBody } from '@clinvo/shared';
import { env } from '../../env.js';
import { AppError } from '../../middleware/errorHandler.js';

export function authRouter(): Router {
  const router = Router();

  // POST /v1/admin/auth/login
  router.post('/login', async (req, res, next) => {
    try {
      const parsed = AdminLoginBody.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body'));
      }

      const { username, password } = parsed.data;

      if (username !== env.ADMIN_USERNAME) {
        return next(new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password'));
      }

      const valid = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
      if (!valid) {
        return next(new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password'));
      }

      const token = jwt.sign(
        { sub: 'admin', role: 'admin' },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRY } as jwt.SignOptions,
      );

      res.json({ token, expiresIn: env.JWT_EXPIRY });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
