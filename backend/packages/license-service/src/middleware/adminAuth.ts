import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual, createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import { AppError } from './errorHandler.js';

// Augment Express Request to carry isAdmin flag
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      isAdmin?: boolean;
      licenseId?: string;
      tenantId?: string;
      planId?: string;
    }
  }
}

function safeCompare(a: string, b: string): boolean {
  // Pad shorter string to same length to prevent length-based timing attacks
  const aHash = createHash('sha256').update(a).digest();
  const bHash = createHash('sha256').update(b).digest();
  return timingSafeEqual(aHash, bHash);
}

export function adminAuth(req: Request, _res: Response, next: NextFunction): void {
  // Path 1: x-admin-key header
  const adminKey = req.headers['x-admin-key'];
  if (typeof adminKey === 'string') {
    if (safeCompare(adminKey, env.ADMIN_SECRET_KEY)) {
      req.isAdmin = true;
      next();
      return;
    }
    next(new AppError(401, 'UNAUTHORIZED', 'Admin authentication required'));
    return;
  }

  // Path 2: JWT Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { role?: string };
      if (payload.role === 'admin') {
        req.isAdmin = true;
        next();
        return;
      }
      next(new AppError(401, 'UNAUTHORIZED', 'Admin authentication required'));
      return;
    } catch {
      next(new AppError(401, 'UNAUTHORIZED', 'Admin authentication required'));
      return;
    }
  }

  next(new AppError(401, 'UNAUTHORIZED', 'Admin authentication required'));
}
