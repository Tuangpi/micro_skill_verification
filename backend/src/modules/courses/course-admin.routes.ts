import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { sendData } from '../../shared/utils/response.js';
import { createCsrfProtection } from '../auth/csrf.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import type { CourseService } from './course.service.js';

export type CourseAdminRouterDeps = {
  courseService: CourseService;
  allowedOrigins: string[];
  isProduction: boolean;
};

export function createCourseAdminRouter(deps: CourseAdminRouterDeps): Router {
  const router = Router();
  const csrfProtection = createCsrfProtection(deps.allowedOrigins);

  function getUser(req: Request) {
    return (req as Request & { currentUser?: { id: string; role: string } }).currentUser;
  }

  router.post(
    '/courses/:id/publish',
    csrfProtection,
    requireAuth,
    requireRole('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = getUser(req);
        if (!user) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }
        const view = await deps.courseService.publishCourse(
          user.id,
          String(req.params.id),
        );
        sendData(res, { course: view });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/courses/:id/reject',
    csrfProtection,
    requireAuth,
    requireRole('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = getUser(req);
        if (!user) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }
        const view = await deps.courseService.rejectCourse(
          user.id,
          String(req.params.id),
          req.body,
        );
        sendData(res, { course: view });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/courses/:id/archive',
    csrfProtection,
    requireAuth,
    requireRole('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = getUser(req);
        if (!user) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }
        const view = await deps.courseService.archiveCourse(
          user.id,
          String(req.params.id),
        );
        sendData(res, { course: view });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
