import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

import { env, corsOrigins } from './config/env';
import { swaggerSpec } from './config/swagger';
import { globalRateLimiter } from './middlewares/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import apiRouter from './routes';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(globalRateLimiter);

  // Archivos subidos (comprobantes, boletas, reportes) — en producción, servir desde S3/CDN
  app.use('/uploads', express.static(path.join(process.cwd(), env.LOCAL_UPLOADS_DIR)));
  app.use('/static', express.static(path.join(process.cwd(), 'static')));

  // Documentación interactiva de la API
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
