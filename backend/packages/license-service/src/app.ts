import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import type { Db } from '@clinvo/shared';
import { errorHandler } from './middleware/errorHandler.js';
import { keysRouter } from './routes/keys.js';
import { authRouter } from './routes/admin/auth.js';
import { licensesAdminRouter } from './routes/admin/licenses.js';
import { tenantsAdminRouter } from './routes/admin/tenants.js';
import { plansAdminRouter } from './routes/admin/plans.js';

export function createApp(db: Db) {
  const app = express();

  // Health check BEFORE any auth middleware so Railway can probe it
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'license-service', version: '1.0.0' });
  });

  // Security & logging
  app.use(helmet());

  const explicitOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['https://admin.clinvo.in', 'https://app.clinvo.in', 'http://localhost:5173', 'http://localhost:5174'];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        try {
          const url = new URL(origin);
          if (
            explicitOrigins.includes(origin) ||
            explicitOrigins.includes('*') ||
            url.hostname.endsWith('.vercel.app') ||
            url.hostname === 'localhost' ||
            url.hostname.endsWith('clinvo.in')
          ) {
            return callback(null, true);
          }
        } catch {
          // fallback
        }
        return callback(null, true);
      },
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(morgan('combined'));

  // Routes
  app.use('/v1/keys', keysRouter(db));
  app.use('/v1/admin/auth', authRouter());
  app.use('/v1/admin/licenses', licensesAdminRouter(db));
  app.use('/v1/admin/tenants', tenantsAdminRouter(db));
  app.use('/v1/admin/plans', plansAdminRouter(db));

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
