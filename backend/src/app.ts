import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { AppConfig } from './config/env.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import { createHealthService } from './modules/health/health.service.js';
import type { PrismaClient } from './shared/database/prisma.js';
import {
  createErrorHandler,
  createNotFoundHandler,
} from './shared/errors/error-handler.js';
import type { AppLogger } from './shared/logger/logger.js';

export type CreateAppOptions = {
  config: AppConfig;
  logger: AppLogger;
  prisma: PrismaClient;
};

/**
 * Builds the Express application.
 *
 * The app is created from injected dependencies so tests can supply a test
 * database client and a silent logger without touching the real environment.
 */
export function createApp({ config, logger, prisma }: CreateAppOptions): Express {
  const app = express();

  if (config.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin: config.allowedOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req): boolean => req.url === `${config.apiPrefix}/health`,
      },
    }),
  );

  const healthService = createHealthService(prisma);
  app.use(config.apiPrefix, createHealthRouter(healthService));

  app.use(createNotFoundHandler());
  app.use(createErrorHandler(logger));

  return app;
}
