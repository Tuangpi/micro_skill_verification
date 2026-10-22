import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import type { AppConfig } from '../../config/env.js';

/**
 * Prisma client factory.
 *
 * Prisma 7 requires a driver adapter; `@prisma/adapter-pg` talks to PostgreSQL
 * through `pg`. The adapter owns the connection pool, so the pool is created
 * here and reused for the lifetime of the process.
 */
export function createPrismaClient(config: AppConfig): PrismaClient {
  const adapter = new PrismaPg({ connectionString: config.databaseUrl });

  return new PrismaClient({
    adapter,
    log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export type { PrismaClient };
export { PrismaPg };
