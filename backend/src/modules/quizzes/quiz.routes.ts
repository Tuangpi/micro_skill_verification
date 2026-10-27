import { Router } from 'express';
import type { Request } from 'express';
import { sendData } from '../../shared/utils/response.js';
import { createCsrfProtection } from '../auth/csrf.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import type { QuizService } from './quiz.service.js';

export type QuizRouterDeps = {
  quizService: QuizService;
  allowedOrigins: string[];
  isProduction: boolean;
};

export function createQuizRouter(deps: QuizRouterDeps): Router {
  const router = Router();
  const csrfProtection = createCsrfProtection(deps.allowedOrigins);

  function getUser(req: Request) {
    return (req as Request & { currentUser?: { id: string; role: string } }).currentUser;
  }

  // Teacher quiz management
  router.post(
    '/teacher/courses/:courseId/quizzes',
    csrfProtection,
    requireAuth,
    requireRole('TEACHER', 'ADMIN'),
    async (req, res, next) => {
      try {
        const user = getUser(req);
        if (!user) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }
        const view = await deps.quizService.createQuiz(
          user.id,
          user.role,
          String(req.params.courseId),
          req.body,
        );
        sendData(res, { quiz: view }, 201);
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/teacher/quizzes/:quizId',
    csrfProtection,
    requireAuth,
    requireRole('TEACHER', 'ADMIN'),
    async (req, res, next) => {
      try {
        const user = getUser(req);
        if (!user) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }
        const view = await deps.quizService.updateQuiz(
          user.id,
          user.role,
          String(req.params.quizId),
          req.body,
        );
        sendData(res, { quiz: view });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/teacher/quizzes/:quizId/questions',
    csrfProtection,
    requireAuth,
    requireRole('TEACHER', 'ADMIN'),
    async (req, res, next) => {
      try {
        const user = getUser(req);
        if (!user) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }
        const view = await deps.quizService.addQuestion(
          user.id,
          user.role,
          String(req.params.quizId),
          req.body,
        );
        sendData(res, { question: view }, 201);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/teacher/quizzes/:quizId',
    requireAuth,
    requireRole('TEACHER', 'ADMIN'),
    async (req, res, next) => {
      try {
        const user = getUser(req);
        if (!user) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }
        const view = await deps.quizService.getQuizForTeacher(
          user.id,
          user.role,
          String(req.params.quizId),
        );
        sendData(res, view);
      } catch (err) {
        next(err);
      }
    },
  );

  // Student
  router.get('/quizzes/:quizId', requireAuth, async (req, res, next) => {
    try {
      const user = getUser(req);
      if (!user) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      const view = await deps.quizService.getQuizForStudent(
        user.id,
        String(req.params.quizId),
      );
      sendData(res, view);
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/quizzes/:quizId/attempts',
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
        const view = await deps.quizService.submitAttempt(
          user.id,
          String(req.params.quizId),
          req.body,
        );
        sendData(res, { attempt: view }, 201);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/me/certificates', requireAuth, async (req, res, next) => {
    try {
      const user = getUser(req);
      if (!user) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      const list = await deps.quizService.listMyCertificates(user.id);
      sendData(res, { certificates: list });
    } catch (err) {
      next(err);
    }
  });

  // Public verification
  router.get('/certificates/:number/verify', async (req, res, next) => {
    try {
      const view = await deps.quizService.verifyCertificate(String(req.params.number));
      sendData(res, { certificate: view });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
