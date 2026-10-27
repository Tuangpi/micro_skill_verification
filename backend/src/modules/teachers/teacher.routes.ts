import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { sendData } from '../../shared/utils/response.js';
import { createCsrfProtection, issueCsrfToken } from '../auth/csrf.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import type { TeacherService } from './teacher.service.js';

export type TeacherRouterDeps = {
  teacherService: TeacherService;
  allowedOrigins: string[];
  isProduction: boolean;
};

export function createTeacherRouter(deps: TeacherRouterDeps): Router {
  const router = Router();
  const csrfProtection = createCsrfProtection(deps.allowedOrigins);

  router.get('/csrf-token', (_req: Request, res: Response) => {
    const token = issueCsrfToken(res, deps.isProduction);
    sendData(res, { csrfToken: token });
  });

  // Submit (or resubmit after rejection) a teacher application.
  router.post(
    '/applications',
    csrfProtection,
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as Request & { currentUser?: { id: string } }).currentUser;
        if (!user) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }
        const view = await deps.teacherService.submitApplication(user.id, req.body);
        sendData(res, { application: view }, 201);
      } catch (err) {
        next(err);
      }
    },
  );

  // Current user's application.
  router.get(
    '/applications/me',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as Request & { currentUser?: { id: string } }).currentUser;
        if (!user) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }
        const view = await deps.teacherService.getMyApplication(user.id);
        sendData(res, { application: view });
      } catch (err) {
        next(err);
      }
    },
  );

  // Approved-teacher-only ping (eligibility enforcement).
  router.get(
    '/ping',
    requireAuth,
    requireRole('TEACHER'),
    (_req: Request, res: Response) => {
      sendData(res, { ok: true });
    },
  );

  // Eligibility check for the current user.
  router.get(
    '/eligibility',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = (req as Request & { currentUser?: { id: string } }).currentUser;
        if (!user) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }
        const approved = await deps.teacherService.isApprovedTeacher(user.id);
        const application = await deps.teacherService.getMyApplication(user.id);
        sendData(res, { approved, application });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

export function createTeacherAdminRouter(deps: TeacherRouterDeps): Router {
  const router = Router();
  const csrfProtection = createCsrfProtection(deps.allowedOrigins);

  router.get(
    '/teacher-applications',
    requireAuth,
    requireRole('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const status =
          typeof req.query.status === 'string' ? req.query.status : undefined;
        const allowed = ['PENDING', 'APPROVED', 'REJECTED'] as const;
        const filter =
          status && (allowed as readonly string[]).includes(status)
            ? (status as 'PENDING' | 'APPROVED' | 'REJECTED')
            : undefined;
        const list = await deps.teacherService.listApplications(filter);
        sendData(res, { applications: list });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/teacher-applications/:id',
    requireAuth,
    requireRole('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const view = await deps.teacherService.getApplication(String(req.params.id));
        sendData(res, { application: view });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/teacher-applications/:id/approve',
    csrfProtection,
    requireAuth,
    requireRole('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const admin = (req as Request & { currentUser?: { id: string } }).currentUser;
        if (!admin) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }
        const view = await deps.teacherService.approveApplication(
          admin.id,
          String(req.params.id),
          req.body,
        );
        sendData(res, { application: view });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/teacher-applications/:id/reject',
    csrfProtection,
    requireAuth,
    requireRole('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const admin = (req as Request & { currentUser?: { id: string } }).currentUser;
        if (!admin) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }
        const view = await deps.teacherService.rejectApplication(
          admin.id,
          String(req.params.id),
          req.body,
        );
        sendData(res, { application: view });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
