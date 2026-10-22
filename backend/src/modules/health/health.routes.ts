import { Router } from 'express';
import { sendData } from '../../shared/utils/response.js';
import type { HealthService } from './health.service.js';

/**
 * Health routes.
 *
 * `GET /api/v1/health` returns HTTP 200 when the service and its database are
 * healthy, and HTTP 503 when a dependency check fails, so that a load balancer
 * or uptime monitor can act on the status code rather than the body.
 */
export function createHealthRouter(healthService: HealthService): Router {
  const router = Router();

  router.get('/health', async (_req, res, next) => {
    try {
      const report = await healthService.check();
      sendData(res, report, report.status === 'ok' ? 200 : 503);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
