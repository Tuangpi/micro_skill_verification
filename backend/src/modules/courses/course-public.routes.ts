import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { sendData } from '../../shared/utils/response.js';
import type { CourseService } from './course.service.js';

export type PublicCourseRouterDeps = {
  courseService: CourseService;
};

export function createPublicCourseRouter(deps: PublicCourseRouterDeps): Router {
  const router = Router();

  router.get('/courses', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const list = await deps.courseService.listPublishedCourses();
      sendData(res, { courses: list });
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/courses/:slug',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const view = await deps.courseService.getPublishedCourseBySlug(
          String(req.params.slug),
        );
        sendData(res, { course: view });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
