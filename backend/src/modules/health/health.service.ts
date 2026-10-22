import { z } from 'zod';
import type { PrismaClient } from '../../shared/database/prisma.js';

/**
 * Health module.
 *
 * The endpoint reports process liveness and database reachability. It exposes
 * no secrets and no internal details: the database check reports only a
 * boolean status, never host, credentials, or error internals.
 */

export const healthQuerySchema = z.object({});

export type HealthStatus = 'ok' | 'degraded';

export type HealthReport = {
  status: HealthStatus;
  uptimeSeconds: number;
  timestamp: string;
  checks: {
    database: {
      status: 'up' | 'down';
      latencyMs: number;
    };
  };
};

export type HealthService = {
  check: () => Promise<HealthReport>;
};

export function createHealthService(prisma: PrismaClient): HealthService {
  return {
    async check() {
      const startedAt = performance.now();
      let databaseStatus: 'up' | 'down';

      try {
        await prisma.$queryRaw`SELECT 1`;
        databaseStatus = 'up';
      } catch {
        databaseStatus = 'down';
      }

      const latencyMs = Math.round((performance.now() - startedAt) * 100) / 100;

      return {
        status: databaseStatus === 'up' ? 'ok' : 'degraded',
        uptimeSeconds: Math.round(process.uptime() * 100) / 100,
        timestamp: new Date().toISOString(),
        checks: {
          database: {
            status: databaseStatus,
            latencyMs,
          },
        },
      };
    },
  };
}
