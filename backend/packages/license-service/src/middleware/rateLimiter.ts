import rateLimit from 'express-rate-limit';
import { Request } from 'express';

export const verifyRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  keyGenerator: (req: Request): string => {
    const auth = req.headers.authorization;
    if (typeof auth === 'string') return auth;
    return req.ip ?? 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again in a minute',
    },
  },
});
