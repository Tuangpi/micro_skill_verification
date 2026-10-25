import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { sendData } from '../../shared/utils/response.js';
import { createCsrfProtection, issueCsrfToken } from './csrf.js';
import type { AuthService, AuthedUser } from './auth.service.js';
import { loginSchema, resetRequestSchema, resetConsumeSchema } from './schemas.js';

export type AuthRouterDeps = {
  authService: AuthService;
  loadUser: (id: string) => Promise<AuthedUser | null>;
  allowedOrigins: string[];
  isProduction: boolean;
  idleMinutes: number;
  absoluteHours: number;
};

export function createAuthRouter(deps: AuthRouterDeps): Router {
  const router = Router();
  const csrfProtection = createCsrfProtection(deps.allowedOrigins);

  // Issue CSRF token (also sets cookie).
  router.get('/csrf-token', (req: Request, res: Response) => {
    const token = issueCsrfToken(res, deps.isProduction);
    sendData(res, { csrfToken: token });
  });

  // Registration
  router.post(
    '/register',
    csrfProtection,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = await deps.authService.register(req.body);
        sendData(res, { user }, 201);
      } catch (err) {
        next(err);
      }
    },
  );

  // Login
  router.post(
    '/login',
    csrfProtection,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(422).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: parsed.error.issues,
            },
          });
          return;
        }
        const user = await deps.authService.login(parsed.data);

        // Regenerate session to prevent fixation.
        req.session.regenerate((err) => {
          if (err) {
            next(err);
            return;
          }
          req.session.userId = user.id;
          req.session.absoluteExpiresAt =
            Date.now() + deps.absoluteHours * 60 * 60 * 1000;
          req.session.save((saveErr) => {
            if (saveErr) {
              next(saveErr);
              return;
            }
            sendData(res, { user });
          });
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // Logout
  router.post(
    '/logout',
    csrfProtection,
    (req: Request, res: Response, next: NextFunction) => {
      req.session.destroy((err) => {
        if (err) {
          next(err);
          return;
        }
        res.clearCookie('connect.sid');
        res.status(204).end();
      });
    },
  );

  // Current session
  router.get('/session', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      const user = await deps.loadUser(userId);
      if (!user || !user.isActive) {
        req.session.destroy(() => undefined);
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      const now = Date.now();
      if (req.session.absoluteExpiresAt && now > req.session.absoluteExpiresAt) {
        req.session.destroy(() => undefined);
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Session expired' } });
        return;
      }
      // rolling idle: touch session
      req.session.touch();
      sendData(res, { user });
    } catch (err) {
      next(err);
    }
  });

  // Password reset request
  router.post(
    '/password-reset-requests',
    csrfProtection,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const parsed = resetRequestSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(422).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: parsed.error.issues,
            },
          });
          return;
        }
        await deps.authService.requestPasswordReset(parsed.data);
        sendData(res, { message: 'If an account exists, a reset link has been sent' });
      } catch (err) {
        next(err);
      }
    },
  );

  // Password reset consume
  router.post(
    '/password-resets',
    csrfProtection,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const parsed = resetConsumeSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(422).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: parsed.error.issues,
            },
          });
          return;
        }
        await deps.authService.consumePasswordReset(parsed.data);
        sendData(res, { message: 'Password has been reset' });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
