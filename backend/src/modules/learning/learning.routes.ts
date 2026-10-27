import { Router } from 'express';
import type { Request } from 'express';
import { sendData } from '../../shared/utils/response.js';
import { createCsrfProtection } from '../auth/csrf.js';
import { requireAuth } from '../auth/auth.middleware.js';
import type { LearningService } from './learning.service.js';

export type LearningRouterDeps = {
  learningService: LearningService;
  allowedOrigins: string[];
  isProduction: boolean;
};

export function createLearningRouter(deps: LearningRouterDeps): Router {
  const router = Router();
  const csrfProtection = createCsrfProtection(deps.allowedOrigins);

  function getUser(req: Request) {
    return (req as Request & { currentUser?: { id: string; role: string } }).currentUser;
  }

  router.get('/lessons/:id', requireAuth, async (req, res, next) => {
    try {
      const user = getUser(req);
      if (!user) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      const view = await deps.learningService.getLesson(
        user.id,
        user.role,
        String(req.params.id),
      );
      sendData(res, view);
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/lessons/:id/progress',
    csrfProtection,
    requireAuth,
    async (req, res, next) => {
      try {
        const user = getUser(req);
        if (!user) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }
        const view = await deps.learningService.updateProgress(
          user.id,
          user.role,
          String(req.params.id),
          req.body,
        );
        sendData(res, { progress: view });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
