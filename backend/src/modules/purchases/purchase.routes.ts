import { Router } from 'express';
import type { Request } from 'express';
import multer from 'multer';
import { sendData } from '../../shared/utils/response.js';
import { createCsrfProtection } from '../auth/csrf.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import type { PurchaseService } from './purchase.service.js';

export type PurchaseRouterDeps = {
  purchaseService: PurchaseService;
  allowedOrigins: string[];
  isProduction: boolean;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function getUser(req: Request) {
  return (req as Request & { currentUser?: { id: string; role: string } }).currentUser;
}

export function createPurchaseRouter(deps: PurchaseRouterDeps): Router {
  const router = Router();
  const csrfProtection = createCsrfProtection(deps.allowedOrigins);

  router.post('/purchases', csrfProtection, requireAuth, async (req, res, next) => {
    try {
      const user = getUser(req);
      if (!user) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      const result = await deps.purchaseService.createPurchase(user.id, req.body);
      sendData(res, result, 201);
    } catch (err) {
      next(err);
    }
  });

  router.get('/purchases/mine', requireAuth, async (req, res, next) => {
    try {
      const user = getUser(req);
      if (!user) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      const list = await deps.purchaseService.listMyPurchases(user.id);
      sendData(res, { purchases: list });
    } catch (err) {
      next(err);
    }
  });

  router.get('/purchases/:id', requireAuth, async (req, res, next) => {
    try {
      const user = getUser(req);
      if (!user) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      const view = await deps.purchaseService.getPurchase(
        user.id,
        user.role,
        String(req.params.id),
      );
      sendData(res, { purchase: view });
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/purchases/:id/payment-submissions',
    csrfProtection,
    requireAuth,
    upload.single('receipt'),
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
        const view = await deps.purchaseService.createPaymentSubmission(
          user.id,
          String(req.params.id),
          req.body,
          f,
        );
        sendData(res, { paymentSubmission: view }, 201);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/me/enrollments', requireAuth, async (req, res, next) => {
    try {
      const user = getUser(req);
      if (!user) {
        res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      const list = await deps.purchaseService.listMyEnrollments(user.id);
      sendData(res, { enrollments: list });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function createPurchaseAdminRouter(deps: PurchaseRouterDeps): Router {
  const router = Router();
  const csrfProtection = createCsrfProtection(deps.allowedOrigins);

  router.get(
    '/payment-submissions',
    requireAuth,
    requireRole('ADMIN'),
    async (req, res, next) => {
      try {
        const status =
          typeof req.query.status === 'string'
            ? (req.query.status as 'PENDING' | 'APPROVED' | 'REJECTED')
            : undefined;
        const list = await deps.purchaseService.listPaymentSubmissions(status);
        sendData(res, { paymentSubmissions: list });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/payment-submissions/:id',
    requireAuth,
    requireRole('ADMIN'),
    async (req, res, next) => {
      try {
        const view = await deps.purchaseService.getPaymentSubmission(
          String(req.params.id),
        );
        sendData(res, { paymentSubmission: view });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/payment-submissions/:id/approve',
    csrfProtection,
    requireAuth,
    requireRole('ADMIN'),
    async (req, res, next) => {
      try {
        const user = getUser(req);
        if (!user) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }
        const view = await deps.purchaseService.approvePaymentSubmission(
          user.id,
          String(req.params.id),
          req.body,
        );
        sendData(res, { paymentSubmission: view });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/payment-submissions/:id/reject',
    csrfProtection,
    requireAuth,
    requireRole('ADMIN'),
    async (req, res, next) => {
      try {
        const user = getUser(req);
        if (!user) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }
        const view = await deps.purchaseService.rejectPaymentSubmission(
          user.id,
          String(req.params.id),
          req.body,
        );
        sendData(res, { paymentSubmission: view });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
