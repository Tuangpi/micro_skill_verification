import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import { pinoHttp } from 'pino-http';
import type { AppConfig } from './config/env.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import { createHealthService } from './modules/health/health.service.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createAuthRateLimiter } from './modules/auth/rate-limit.js';
import { createTeacherService } from './modules/teachers/teacher.service.js';
import { createCourseService } from './modules/courses/course.service.js';
import { createCourseRouter } from './modules/courses/course.routes.js';
import { createFileStorage } from './shared/storage/file-storage.js';
import {
  createTeacherRouter,
  createTeacherAdminRouter,
} from './modules/teachers/teacher.routes.js';
import { attachCurrentUser } from './modules/auth/auth.middleware.js';
import { createConsoleDelivery } from './modules/auth/delivery.js';
import type { AuthedUser } from './modules/auth/auth.service.js';
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
  sessionStore?: session.Store;
};

export function createApp({
  config,
  logger,
  prisma,
  sessionStore,
}: CreateAppOptions): Express {
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

  const PgSession = connectPgSimple(session);
  const pool = new Pool({ connectionString: config.databaseUrl });
  const store =
    sessionStore ??
    new PgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
    });

  app.use(
    session({
      name: 'connect.sid',
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      store,
      cookie: {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
        maxAge: config.sessionIdleMinutes * 60 * 1000,
      },
    }),
  );

  const authService = createAuthService(
    prisma,
    config,
    logger,
    createConsoleDelivery(logger, config.isProduction),
  );
  app.use(
    attachCurrentUser(async (id) => {
      const user = await authService.loadUser(id);
      return user as AuthedUser | null;
    }),
  );

  const healthService = createHealthService(prisma);
  app.use(config.apiPrefix, createHealthRouter(healthService));

  const authRateLimiter = createAuthRateLimiter(config);
  const authRouter = createAuthRouter({
    authService,
    loadUser: async (id) => authService.loadUser(id),
    allowedOrigins: config.allowedOrigins,
    isProduction: config.isProduction,
    idleMinutes: config.sessionIdleMinutes,
    absoluteHours: config.sessionAbsoluteHours,
  });

  app.use(`${config.apiPrefix}/auth`, authRateLimiter, authRouter);

  const teacherService = createTeacherService(prisma, logger);
  const teacherRouter = createTeacherRouter({
    teacherService,
    allowedOrigins: config.allowedOrigins,
    isProduction: config.isProduction,
  });
  app.use(`${config.apiPrefix}/teacher`, teacherRouter);

  const fileStorage = createFileStorage(config);
  const courseService = createCourseService(prisma, logger, fileStorage);
  const courseRouter = createCourseRouter({
    courseService,
    fileStorage,
    allowedOrigins: config.allowedOrigins,
    isProduction: config.isProduction,
  });
  app.use(`${config.apiPrefix}/teacher`, courseRouter);

  const teacherAdminRouter = createTeacherAdminRouter({
    teacherService,
    allowedOrigins: config.allowedOrigins,
    isProduction: config.isProduction,
  });
  app.use(`${config.apiPrefix}/admin`, teacherAdminRouter);

  const adminRouter = express.Router();
  adminRouter.get('/ping', (req, res) => {
    const user = (req as express.Request & { currentUser?: AuthedUser }).currentUser;
    if (!user) {
      res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    if (user.role !== 'ADMIN') {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action',
        },
      });
      return;
    }
    res.json({ data: { ok: true, user } });
  });
  app.use(`${config.apiPrefix}/admin`, adminRouter);

  app.use(createNotFoundHandler());
  app.use(createErrorHandler(logger));

  return app;
}
