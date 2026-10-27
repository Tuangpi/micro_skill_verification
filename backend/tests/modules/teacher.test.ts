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

async function registerUser(
  agent: ReturnType<typeof request.agent>,
  email: string,
  password = 'password123',
) {
  const csrf = await getCsrf(agent);
  await agent
    .post('/api/v1/auth/register')
    .set('X-CSRF-Token', csrf)
    .send({ email, name: 'Test User', password });
  const loginCsrf = await getCsrf(agent);
  await agent
    .post('/api/v1/auth/login')
    .set('X-CSRF-Token', loginCsrf)
    .send({ email, password });
}

describe('Teacher applications', () => {
  let app: Express;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const config = loadConfig();
    prisma = createPrismaClient(config);
    app = createApp({ config, logger: pino({ level: 'silent' }), prisma });
    await prisma.auditLog.deleteMany();
    await prisma.teacherProfile.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$executeRaw`DELETE FROM "session"`;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.teacherProfile.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$executeRaw`DELETE FROM "session"`;
    await prisma.$disconnect();
  });

  it('requires authentication to submit an application', async () => {
    const agent = request.agent(app);
    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/teacher/applications')
      .set('X-CSRF-Token', csrf)
      .send({ bio: 'hello' });
    expect(res.status).toBe(401);
  });

  it('allows a student to submit an application', async () => {
    const agent = request.agent(app);
    await registerUser(agent, 'student1@example.com');
    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/teacher/applications')
      .set('X-CSRF-Token', csrf)
      .send({ bio: 'I teach design', expertise: 'Graphic design' });
    expect(res.status).toBe(201);
    expect(res.body.data.application.status).toBe('PENDING');
    expect(res.body.data.application.userEmail).toBe('student1@example.com');
  });

  it('rejects a duplicate pending application', async () => {
    const agent = request.agent(app);
    await registerUser(agent, 'student2@example.com');
    const csrf = await getCsrf(agent);
    await agent
      .post('/api/v1/teacher/applications')
      .set('X-CSRF-Token', csrf)
      .send({ bio: 'first' });
    const csrf2 = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/teacher/applications')
      .set('X-CSRF-Token', csrf2)
      .send({ bio: 'second' });
    expect(res.status).toBe(409);
  });

  it('blocks non-admins from listing applications', async () => {
    const agent = request.agent(app);
    await registerUser(agent, 'student3@example.com');
    const res = await agent.get('/api/v1/admin/teacher-applications');
    expect(res.status).toBe(403);
  });

  it('approves an application and promotes the user to TEACHER', async () => {
    const adminAgent = request.agent(app);
    await registerUser(adminAgent, 'admin@example.com');
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
    });
    await prisma.user.update({ where: { id: adminUser!.id }, data: { role: 'ADMIN' } });

    const csrfLogin = await getCsrf(adminAgent);
    await adminAgent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrfLogin)
      .send({ email: 'admin@example.com', password: 'password123' });

    const studentAgent = request.agent(app);
    await registerUser(studentAgent, 'teacher1@example.com');
    const scsrf = await getCsrf(studentAgent);
    const submitRes = await studentAgent
      .post('/api/v1/teacher/applications')
      .set('X-CSRF-Token', scsrf)
      .send({ bio: 'teach' });
    const appId = submitRes.body.data.application.id as string;

    const acsrf = await getCsrf(adminAgent);
    const approveRes = await adminAgent
      .post(`/api/v1/admin/teacher-applications/${appId}/approve`)
      .set('X-CSRF-Token', acsrf)
      .send({ note: 'looks good' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.application.status).toBe('APPROVED');

    const updatedUser = await prisma.user.findUnique({
      where: { email: 'teacher1@example.com' },
    });
    expect(updatedUser!.role).toBe('TEACHER');

    const pingRes = await studentAgent.get('/api/v1/teacher/ping');
    expect(pingRes.status).toBe(200);

    const logs = await prisma.auditLog.findMany({ where: { targetId: appId } });
    expect(logs.length).toBe(1);
    expect(logs[0]!.action).toBe('TEACHER_APPLICATION_APPROVED');
  });

  it('rejects an application and keeps user as STUDENT', async () => {
    const adminAgent = request.agent(app);
    const csrfLogin = await getCsrf(adminAgent);
    await adminAgent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrfLogin)
      .send({ email: 'admin@example.com', password: 'password123' });

    const studentAgent = request.agent(app);
    await registerUser(studentAgent, 'rejected@example.com');
    const scsrf = await getCsrf(studentAgent);
    const submitRes = await studentAgent
      .post('/api/v1/teacher/applications')
      .set('X-CSRF-Token', scsrf)
      .send({ bio: 'nope' });
    const appId = submitRes.body.data.application.id as string;

    const acsrf = await getCsrf(adminAgent);
    const rejectRes = await adminAgent
      .post(`/api/v1/admin/teacher-applications/${appId}/reject`)
      .set('X-CSRF-Token', acsrf)
      .send({ note: 'not enough experience' });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.application.status).toBe('REJECTED');

    const updatedUser = await prisma.user.findUnique({
      where: { email: 'rejected@example.com' },
    });
    expect(updatedUser!.role).toBe('STUDENT');

    const pingRes = await studentAgent.get('/api/v1/teacher/ping');
    expect(pingRes.status).toBe(403);
  });

  it('allows resubmission after rejection', async () => {
    const studentAgent = request.agent(app);
    await registerUser(studentAgent, 'resubmit@example.com');
    const scsrf = await getCsrf(studentAgent);
    const submitRes = await studentAgent
      .post('/api/v1/teacher/applications')
      .set('X-CSRF-Token', scsrf)
      .send({ bio: 'first try' });
    const appId = submitRes.body.data.application.id as string;

    const adminAgent = request.agent(app);
    const csrfLogin = await getCsrf(adminAgent);
    await adminAgent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrfLogin)
      .send({ email: 'admin@example.com', password: 'password123' });
    const acsrf = await getCsrf(adminAgent);
    await adminAgent
      .post(`/api/v1/admin/teacher-applications/${appId}/reject`)
      .set('X-CSRF-Token', acsrf)
      .send({ note: 'retry' });

    const scsrf2 = await getCsrf(studentAgent);
    const resubmitRes = await studentAgent
      .post('/api/v1/teacher/applications')
      .set('X-CSRF-Token', scsrf2)
      .send({ bio: 'second try' });
    expect(resubmitRes.status).toBe(201);
    expect(resubmitRes.body.data.application.status).toBe('PENDING');
  });

  it('prevents approving a non-pending application', async () => {
    const adminAgent = request.agent(app);
    const csrfLogin = await getCsrf(adminAgent);
    await adminAgent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrfLogin)
      .send({ email: 'admin@example.com', password: 'password123' });

    const studentAgent = request.agent(app);
    await registerUser(studentAgent, 'doubleapprove@example.com');
    const scsrf = await getCsrf(studentAgent);
    const submitRes = await studentAgent
      .post('/api/v1/teacher/applications')
      .set('X-CSRF-Token', scsrf)
      .send({ bio: 'x' });
    const appId = submitRes.body.data.application.id as string;

    const acsrf = await getCsrf(adminAgent);
    await adminAgent
      .post(`/api/v1/admin/teacher-applications/${appId}/approve`)
      .set('X-CSRF-Token', acsrf)
      .send({});

    const acsrf2 = await getCsrf(adminAgent);
    const second = await adminAgent
      .post(`/api/v1/admin/teacher-applications/${appId}/approve`)
      .set('X-CSRF-Token', acsrf2)
      .send({});
    expect(second.status).toBe(409);
  });

  it('filters applications by status', async () => {
    const adminAgent = request.agent(app);
    const csrfLogin = await getCsrf(adminAgent);
    await adminAgent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrfLogin)
      .send({ email: 'admin@example.com', password: 'password123' });

    const res = await adminAgent.get('/api/v1/admin/teacher-applications?status=PENDING');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.applications)).toBe(true);
  });

  it('returns own application via me endpoint', async () => {
    const studentAgent = request.agent(app);
    await registerUser(studentAgent, 'me@example.com');
    const scsrf = await getCsrf(studentAgent);
    await studentAgent
      .post('/api/v1/teacher/applications')
      .set('X-CSRF-Token', scsrf)
      .send({ bio: 'me' });

    const res = await studentAgent.get('/api/v1/teacher/applications/me');
    expect(res.status).toBe(200);
    expect(res.body.data.application).not.toBeNull();
  });

  it('returns eligibility for current user', async () => {
    const studentAgent = request.agent(app);
    await registerUser(studentAgent, 'elig@example.com');
    const res = await studentAgent.get('/api/v1/teacher/eligibility');
    expect(res.status).toBe(200);
    expect(res.body.data.approved).toBe(false);
  });
});
