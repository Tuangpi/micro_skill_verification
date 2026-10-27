import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { sendData } from '../../shared/utils/response.js';
import { createCsrfProtection } from '../auth/csrf.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import type { EarningsService } from './earnings.service.js';

export type EarningsRouterDeps = {
  earningsService: EarningsService;
  allowedOrigins: string[];
  isProduction: boolean;
};

function getUser(req: Request) {
  return (req as Request & { currentUser?: { id: string; role: string } }).currentUser;
}

export function createEarningsRouter(deps: EarningsRouterDeps): Router {
  const router = Router();
  const csrfProtection = createCsrfProtection(deps.allowedOrigins);

  // Teacher earnings visibility for the current user.
  router.get(
    '/teacher/earnings',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = getUser(req);
        if (!user) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }
        const target =
          typeof req.query.teacherId === 'string' ? req.query.teacherId : undefined;
        const summary = await deps.earningsService.getTeacherEarnings(
          user.id,
          user.role,
          target,
        );
        sendData(res, { earnings: summary });
      } catch (err) {
        next(err);
      }
    },
  );

  // Admin: list all earnings entries.
  router.get(
    '/admin/earnings',
    requireAuth,
    requireRole('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const teacherId =
          typeof req.query.teacherId === 'string' ? req.query.teacherId : undefined;
        const type =
          typeof req.query.type === 'string'
            ? (req.query.type as 'SALE' | 'REFUND' | 'ADJUSTMENT')
            : undefined;
        const filters: { teacherId?: string; type?: 'SALE' | 'REFUND' | 'ADJUSTMENT' } =
          {};
        if (teacherId) filters.teacherId = teacherId;
        if (type) filters.type = type;
        const entries = await deps.earningsService.listAllEarnings(filters);
        sendData(res, { earnings: entries });
      } catch (err) {
        next(err);
      }
    },
  );

  // Admin: create an adjustment entry.
  router.post(
    '/admin/earnings/adjustments',
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
        const view = await deps.earningsService.createAdjustment(user.id, req.body);
        sendData(res, { earning: view }, 201);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
