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

async function getCsrf(agent: ReturnType<typeof request.agent>): Promise<string> {
  const res = await agent.get('/api/v1/auth/csrf-token');
  return res.body.data.csrfToken as string;
}

describe('Auth flow', () => {
  let app: Express;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const config = loadConfig();
    prisma = createPrismaClient(config);
    app = createApp({ config, logger: pino({ level: 'silent' }), prisma });
    await prisma.passwordResetToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$executeRaw`DELETE FROM "session"`;
  });

  afterAll(async () => {
    await prisma.passwordResetToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$executeRaw`DELETE FROM "session"`;
    await prisma.$disconnect();
  });

  it('registers a new user as STUDENT', async () => {
    const agent = request.agent(app);
    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/register')
      .set('X-CSRF-Token', csrf)
      .send({ email: 'student@example.com', name: 'Student', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('STUDENT');
  });

  it('rejects duplicate registration', async () => {
    const agent = request.agent(app);
    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/register')
      .set('X-CSRF-Token', csrf)
      .send({ email: 'student@example.com', name: 'Student', password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('rejects invalid login', async () => {
    const agent = request.agent(app);
    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ email: 'student@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('logs in with valid credentials and exposes session', async () => {
    const agent = request.agent(app);
    const csrf = await getCsrf(agent);
    const loginRes = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ email: 'student@example.com', password: 'password123' });
    expect(loginRes.status).toBe(200);
    const sessionRes = await agent.get('/api/v1/auth/session');
    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body.data.user.email).toBe('student@example.com');
  });

  it('logs out and invalidates session', async () => {
    const agent = request.agent(app);
    const csrf = await getCsrf(agent);
    await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ email: 'student@example.com', password: 'password123' });
    const csrf2 = await getCsrf(agent);
    const logoutRes = await agent.post('/api/v1/auth/logout').set('X-CSRF-Token', csrf2);
    expect(logoutRes.status).toBe(204);
    const sessionRes = await agent.get('/api/v1/auth/session');
    expect(sessionRes.status).toBe(401);
  });

  it('consumes a valid password reset token', async () => {
    const agent = request.agent(app);
    const csrf = await getCsrf(agent);
    await agent
      .post('/api/v1/auth/register')
      .set('X-CSRF-Token', csrf)
      .send({ email: 'reset@example.com', name: 'Reset', password: 'oldpassword1' });

    const user = await prisma.user.findUnique({ where: { email: 'reset@example.com' } });
    const tokens = await import('../../src/modules/auth/tokens.js');
    const { raw } = tokens.generateResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user!.id,
        tokenHash: tokens.hashResetToken(raw),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    const agent2 = request.agent(app);
    const csrf2 = await getCsrf(agent2);
    const res = await agent2
      .post('/api/v1/auth/password-resets')
      .set('X-CSRF-Token', csrf2)
      .send({ token: raw, password: 'newpassword1' });
    expect(res.status).toBe(200);

    const agent3 = request.agent(app);
    const csrf3 = await getCsrf(agent3);
    const loginRes = await agent3
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrf3)
      .send({ email: 'reset@example.com', password: 'newpassword1' });
    expect(loginRes.status).toBe(200);
  });

  it('rejects invalid reset token', async () => {
    const agent = request.agent(app);
    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/auth/password-resets')
      .set('X-CSRF-Token', csrf)
      .send({ token: 'a'.repeat(64), password: 'newpassword1' });
    expect(res.status).toBe(400);
  });

  it('unauthenticated request to admin endpoint returns 401', async () => {
    const res = await request(app).get('/api/v1/admin/ping');
    expect(res.status).toBe(401);
  });
});
