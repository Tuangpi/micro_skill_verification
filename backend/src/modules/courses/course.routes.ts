import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { sendData } from '../../shared/utils/response.js';
import { createCsrfProtection, issueCsrfToken } from '../auth/csrf.js';
import { requireAuth } from '../auth/auth.middleware.js';
import type { CourseService } from './course.service.js';
import type { FileStorage } from '../../shared/storage/file-storage.js';

export type CourseRouterDeps = {
  courseService: CourseService;
  fileStorage: FileStorage;
  allowedOrigins: string[];
  isProduction: boolean;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export function createCourseRouter(deps: CourseRouterDeps): Router {
  const router = Router();
  const csrfProtection = createCsrfProtection(deps.allowedOrigins);

  router.get('/csrf-token', (_req: Request, res: Response) => {
    const token = issueCsrfToken(res, deps.isProduction);
    sendData(res, { csrfToken: token });
  });

  function getUser(req: Request) {
    return (req as Request & { currentUser?: { id: string; role: string } }).currentUser;
  }

  // Courses
  router.post('/courses', csrfProtection, requireAuth, async (req, res, next) => {
    try {
      const user = getUser(req);
      if (!user) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      const approved = await deps.courseService.isApprovedTeacher(user.id);
      if (user.role === 'TEACHER' && !approved) {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Approved teacher account required' },
        });
        return;
      }
      const view = await deps.courseService.createCourse(user.id, req.body);
      sendData(res, { course: view }, 201);
    } catch (err) {
      next(err);
    }
  });

  router.get('/courses/mine', requireAuth, async (req, res, next) => {
    try {
      const user = getUser(req);
      if (!user) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      const list = await deps.courseService.listMyCourses(user.id);
      sendData(res, { courses: list });
    } catch (err) {
      next(err);
    }
  });

  router.get('/courses/:id', requireAuth, async (req, res, next) => {
    try {
      const user = getUser(req);
      if (!user) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      const view = await deps.courseService.getCourse(
        user.id,
        user.role,
        String(req.params.id),
      );
      sendData(res, { course: view });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/courses/:id', csrfProtection, requireAuth, async (req, res, next) => {
    try {
      const user = getUser(req);
      if (!user) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      const view = await deps.courseService.updateCourse(
        user.id,
        user.role,
        String(req.params.id),
        req.body,
      );
      sendData(res, { course: view });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/courses/:id', csrfProtection, requireAuth, async (req, res, next) => {
    try {
      const user = getUser(req);
      if (!user) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      await deps.courseService.deleteCourse(user.id, user.role, String(req.params.id));
      sendData(res, { ok: true });
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/courses/:id/submit',
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
        const approved = await deps.courseService.isApprovedTeacher(user.id);
        if (user.role === 'TEACHER' && !approved) {
          res.status(403).json({
            error: { code: 'FORBIDDEN', message: 'Approved teacher account required' },
          });
          return;
        }
        const view = await deps.courseService.submitCourse(
          user.id,
          user.role,
          String(req.params.id),
        );
        sendData(res, { course: view });
      } catch (err) {
        next(err);
      }
    },
  );

  // Sections
  router.post(
    '/courses/:courseId/sections',
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
        const view = await deps.courseService.createSection(
          user.id,
          user.role,
          String(req.params.courseId),
          req.body,
        );
        sendData(res, { section: view }, 201);
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch('/sections/:id', csrfProtection, requireAuth, async (req, res, next) => {
    try {
      const user = getUser(req);
      if (!user) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      const view = await deps.courseService.updateSection(
        user.id,
        user.role,
        String(req.params.id),
        req.body,
      );
      sendData(res, { section: view });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/sections/:id', csrfProtection, requireAuth, async (req, res, next) => {
    try {
      const user = getUser(req);
      if (!user) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      await deps.courseService.deleteSection(user.id, user.role, String(req.params.id));
      sendData(res, { ok: true });
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/courses/:courseId/sections/reorder',
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
        await deps.courseService.reorderSections(
          user.id,
          user.role,
          String(req.params.courseId),
          req.body,
        );
        sendData(res, { ok: true });
      } catch (err) {
        next(err);
      }
    },
  );

  // Lessons
  router.post(
    '/sections/:sectionId/lessons',
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
        const view = await deps.courseService.createLesson(
          user.id,
          user.role,
          String(req.params.sectionId),
          req.body,
        );
        sendData(res, { lesson: view }, 201);
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch('/lessons/:id', csrfProtection, requireAuth, async (req, res, next) => {
    try {
      const user = getUser(req);
      if (!user) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      const view = await deps.courseService.updateLesson(
        user.id,
        user.role,
        String(req.params.id),
        req.body,
      );
      sendData(res, { lesson: view });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/lessons/:id', csrfProtection, requireAuth, async (req, res, next) => {
    try {
      const user = getUser(req);
      if (!user) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      await deps.courseService.deleteLesson(user.id, user.role, String(req.params.id));
      sendData(res, { ok: true });
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/sections/:sectionId/lessons/reorder',
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
        await deps.courseService.reorderLessons(
          user.id,
          user.role,
          String(req.params.sectionId),
          req.body,
        );
        sendData(res, { ok: true });
      } catch (err) {
        next(err);
      }
    },
  );

  // Media
  router.post(
    '/media',
    csrfProtection,
    requireAuth,
    upload.single('file'),
    async (req, res, next) => {
      try {
        const user = getUser(req);
        if (!user) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }
        const f = (
          req as {
            file?: {
              buffer: Buffer;
              originalname: string;
              mimetype: string;
              size: number;
            };
          }
        ).file;
        if (!f) {
          res
            .status(400)
            .json({ error: { code: 'BAD_REQUEST', message: 'file is required' } });
          return;
        }
        const view = await deps.courseService.createMediaAsset(user.id, {
          buffer: f.buffer,
          originalname: f.originalname,
          mimetype: f.mimetype,
          size: f.size,
        });
        sendData(res, { media: view }, 201);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/media/:id', requireAuth, async (req, res, next) => {
    try {
      const user = getUser(req);
      if (!user) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      const { asset, storageKey } = await deps.courseService.getMediaAsset(
        user.id,
        user.role,
        String(req.params.id),
      );
      const buffer = await deps.fileStorage.read(storageKey);
      res.setHeader('Content-Type', asset.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${asset.originalName}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/media/:id', csrfProtection, requireAuth, async (req, res, next) => {
    try {
      const user = getUser(req);
      if (!user) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      await deps.courseService.deleteMediaAsset(
        user.id,
        user.role,
        String(req.params.id),
      );
      sendData(res, { ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
