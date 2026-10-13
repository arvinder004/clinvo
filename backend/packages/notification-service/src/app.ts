import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler.js';
import { internalRouter } from './routes/internal.js';

export function createApp() {
  const app = express();

  // Health check BEFORE auth middleware so Railway can probe it
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'notification-service', version: '1.0.0' });
  });

  app.use(helmet());
  app.use(express.json());
  app.use(morgan('combined'));

  app.use('/v1/internal', internalRouter());

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
