import type { Express } from 'express';
import pino from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/env.js';
import {
  createPrismaClient,
  type PrismaClient,
} from '../../src/shared/database/prisma.js';

/**
 * Health endpoint integration tests.
 *
 * These run against the dedicated test database so they exercise the real
 * Prisma/pg adapter path, including the database connectivity check.
 */
describe('GET /api/v1/health', () => {
  let app: Express;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const config = loadConfig();
    prisma = createPrismaClient(config);
    app = createApp({ config, logger: pino({ level: 'silent' }), prisma });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns 200 with a healthy report when the database is reachable', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.checks.database.status).toBe('up');
    expect(typeof response.body.data.checks.database.latencyMs).toBe('number');
    expect(typeof response.body.data.uptimeSeconds).toBe('number');
    expect(response.body.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('does not expose database connection details', async () => {
    const response = await request(app).get('/api/v1/health');
    const body = JSON.stringify(response.body);

    expect(body).not.toContain('micro_skill');
    expect(body).not.toContain('postgresql://');
    expect(body).not.toContain('password');
  });

  it('returns a not-found envelope for unknown routes', async () => {
    const response = await request(app).get('/api/v1/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
