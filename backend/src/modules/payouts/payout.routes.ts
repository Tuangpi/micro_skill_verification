import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { sendData } from '../../shared/utils/response.js';
import { createCsrfProtection } from '../auth/csrf.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { ForbiddenError } from '../../shared/errors/app-error.js';
import type { PayoutService } from './payout.service.js';

export type PayoutRouterDeps = {
  payoutService: PayoutService;
  allowedOrigins: string[];
  isProduction: boolean;
};

function getUser(req: Request) {
  return (req as Request & { currentUser?: { id: string; role: string } }).currentUser;
}

export function createPayoutRouter(deps: PayoutRouterDeps): Router {
  const router = Router();
  const csrfProtection = createCsrfProtection(deps.allowedOrigins);

  // Teacher requests a payout.
  router.post(
    '/teacher/payout-requests',
    csrfProtection,
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
        const view = await deps.payoutService.createPayoutRequest(user.id, req.body);
        sendData(res, { payoutRequest: view }, 201);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/teacher/payout-requests',
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
        const list = await deps.payoutService.listMyPayoutRequests(user.id);
        sendData(res, { payoutRequests: list });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/teacher/payout-requests/:id',
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
        const view = await deps.payoutService.getPayoutRequest(String(req.params.id));
        if (user.role !== 'ADMIN' && view.teacherId !== user.id)
          throw new ForbiddenError('You do not own this payout request');
        sendData(res, { payoutRequest: view });
      } catch (err) {
        next(err);
      }
    },
  );

  // Admin endpoints.
  router.get(
    '/admin/payout-requests',
    requireAuth,
    requireRole('ADMIN'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const status =
          typeof req.query.status === 'string'
            ? (req.query.status as 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PAID')
            : undefined;
        const teacherId =
          typeof req.query.teacherId === 'string' ? req.query.teacherId : undefined;
        const filters: {
          status?: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PAID';
          teacherId?: string;
        } = {};
        if (status) filters.status = status;
        if (teacherId) filters.teacherId = teacherId;
        const list = await deps.payoutService.listPayoutRequests(filters);
        sendData(res, { payoutRequests: list });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/admin/payout-requests/:id/approve',
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
        const view = await deps.payoutService.approvePayoutRequest(
          user.id,
          String(req.params.id),
          req.body,
        );
        sendData(res, { payoutRequest: view });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/admin/payout-requests/:id/reject',
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
        const view = await deps.payoutService.rejectPayoutRequest(
          user.id,
          String(req.params.id),
          req.body,
        );
        sendData(res, { payoutRequest: view });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/admin/payout-requests/:id/record-payment',
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
        const txn = await deps.payoutService.recordPayout(
          user.id,
          String(req.params.id),
          req.body,
        );
        sendData(res, { payoutTransaction: txn }, 201);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/admin/payouts/report',
    requireAuth,
    requireRole('ADMIN'),
    async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const report = await deps.payoutService.getFinancialReport();
        sendData(res, { report });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
