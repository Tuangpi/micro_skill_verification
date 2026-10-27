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

async function promoteAdmin(prisma: PrismaClient, email: string) {
  const u = await prisma.user.findUnique({ where: { email } });
  await prisma.user.update({ where: { id: u!.id }, data: { role: 'ADMIN' } });
}

async function approveTeacher(
  app: Express,
  adminAgent: ReturnType<typeof request.agent>,
  studentEmail: string,
) {
  // submit application as student
  const studentAgent = request.agent(app);
  await registerUser(studentAgent, studentEmail);
  const scsrf = await getCsrf(studentAgent);
  const submitRes = await studentAgent
    .post('/api/v1/teacher/applications')
    .set('X-CSRF-Token', scsrf)
    .send({ bio: 'teacher' });
  const appId = submitRes.body.data.application.id as string;

  const acsrf = await getCsrf(adminAgent);
  await adminAgent
    .post(`/api/v1/admin/teacher-applications/${appId}/approve`)
    .set('X-CSRF-Token', acsrf)
    .send({});
  return studentAgent;
}

describe('Course authoring', () => {
  let app: Express;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const config = loadConfig();
    prisma = createPrismaClient(config);
    app = createApp({ config, logger: pino({ level: 'silent' }), prisma });
    await prisma.lesson.deleteMany();
    await prisma.courseSection.deleteMany();
    await prisma.course.deleteMany();
    await prisma.mediaAsset.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.teacherProfile.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$executeRaw`DELETE FROM "session"`;
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany();
    await prisma.courseSection.deleteMany();
    await prisma.course.deleteMany();
    await prisma.mediaAsset.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.teacherProfile.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$executeRaw`DELETE FROM "session"`;
    await prisma.$disconnect();
  });

  it('requires authentication to create a course', async () => {
    const agent = request.agent(app);
    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/teacher/courses')
      .set('X-CSRF-Token', csrf)
      .send({ title: 'Design 101', priceMmk: 10000 });
    expect(res.status).toBe(401);
  });

  it('blocks non-approved teachers from creating courses', async () => {
    const agent = request.agent(app);
    await registerUser(agent, 'studentX@example.com');
    const csrf = await getCsrf(agent);
    const res = await agent
      .post('/api/v1/teacher/courses')
      .set('X-CSRF-Token', csrf)
      .send({ title: 'Design 101', priceMmk: 10000 });
    expect(res.status).toBe(403);
  });

  it('allows an approved teacher to create and update a course', async () => {
    const adminAgent = request.agent(app);
    await registerUser(adminAgent, 'admin@example.com');
    await promoteAdmin(prisma, 'admin@example.com');
    // re-login to get admin role in session
    const loginCsrf = await getCsrf(adminAgent);
    await adminAgent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', loginCsrf)
      .send({ email: 'admin@example.com', password: 'password123' });

    const teacherAgent = await approveTeacher(app, adminAgent, 'teacher1@example.com');

    const csrf = await getCsrf(teacherAgent);
    const createRes = await teacherAgent
      .post('/api/v1/teacher/courses')
      .set('X-CSRF-Token', csrf)
      .send({ title: 'Design 101', priceMmk: 10000, description: 'intro' });
    expect(createRes.status).toBe(201);
    const courseId = createRes.body.data.course.id as string;
    expect(createRes.body.data.course.status).toBe('DRAFT');

    const ucsrf = await getCsrf(teacherAgent);
    const updateRes = await teacherAgent
      .patch(`/api/v1/teacher/courses/${courseId}`)
      .set('X-CSRF-Token', ucsrf)
      .send({ title: 'Design 102', priceMmk: 12000 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.course.title).toBe('Design 102');
    expect(updateRes.body.data.course.priceMmk).toBe(12000);
  });

  it('enforces ownership on course update', async () => {
    const adminAgent = request.agent(app);
    await registerUser(adminAgent, 'admin2@example.com');
    await promoteAdmin(prisma, 'admin2@example.com');
    const loginCsrf = await getCsrf(adminAgent);
    await adminAgent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', loginCsrf)
      .send({ email: 'admin2@example.com', password: 'password123' });

    const teacherAgent = await approveTeacher(app, adminAgent, 'teacher2@example.com');
    const csrf = await getCsrf(teacherAgent);
    const createRes = await teacherAgent
      .post('/api/v1/teacher/courses')
      .set('X-CSRF-Token', csrf)
      .send({ title: 'Owned Course', priceMmk: 5000 });
    const courseId = createRes.body.data.course.id as string;

    // another student tries to update
    const otherAgent = request.agent(app);
    await registerUser(otherAgent, 'other@example.com');
    const ocsrf = await getCsrf(otherAgent);
    const res = await otherAgent
      .patch(`/api/v1/teacher/courses/${courseId}`)
      .set('X-CSRF-Token', ocsrf)
      .send({ title: 'Hacked' });
    expect(res.status).toBe(403);
  });

  it('manages sections and lessons with ordering', async () => {
    const adminAgent = request.agent(app);
    await registerUser(adminAgent, 'admin3@example.com');
    await promoteAdmin(prisma, 'admin3@example.com');
    const loginCsrf = await getCsrf(adminAgent);
    await adminAgent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', loginCsrf)
      .send({ email: 'admin3@example.com', password: 'password123' });

    const teacherAgent = await approveTeacher(app, adminAgent, 'teacher3@example.com');
    const csrf = await getCsrf(teacherAgent);
    const createRes = await teacherAgent
      .post('/api/v1/teacher/courses')
      .set('X-CSRF-Token', csrf)
      .send({ title: 'Course X', priceMmk: 5000 });
    const courseId = createRes.body.data.course.id as string;

    // create two sections
    const s1csrf = await getCsrf(teacherAgent);
    const sec1 = await teacherAgent
      .post(`/api/v1/teacher/courses/${courseId}/sections`)
      .set('X-CSRF-Token', s1csrf)
      .send({ title: 'Section A' });
    expect(sec1.status).toBe(201);
    const sec1Id = sec1.body.data.section.id as string;

    const s2csrf = await getCsrf(teacherAgent);
    const sec2 = await teacherAgent
      .post(`/api/v1/teacher/courses/${courseId}/sections`)
      .set('X-CSRF-Token', s2csrf)
      .send({ title: 'Section B' });
    const sec2Id = sec2.body.data.section.id as string;

    // reorder
    const recsrf = await getCsrf(teacherAgent);
    const reorderRes = await teacherAgent
      .post(`/api/v1/teacher/courses/${courseId}/sections/reorder`)
      .set('X-CSRF-Token', recsrf)
      .send({ orderedIds: [sec2Id, sec1Id] });
    expect(reorderRes.status).toBe(200);

    // create lesson in section
    const lcsrf = await getCsrf(teacherAgent);
    const lessonRes = await teacherAgent
      .post(`/api/v1/teacher/sections/${sec1Id}/lessons`)
      .set('X-CSRF-Token', lcsrf)
      .send({
        title: 'Lesson 1',
        videoProvider: 'external_url',
        videoRef: 'https://example.com/v.mp4',
        durationSeconds: 120,
        isPreview: true,
      });
    expect(lessonRes.status).toBe(201);
    const lessonId = lessonRes.body.data.lesson.id as string;
    expect(lessonRes.body.data.lesson.isPreview).toBe(true);

    // update lesson
    const ulcsrf = await getCsrf(teacherAgent);
    const upLesson = await teacherAgent
      .patch(`/api/v1/teacher/lessons/${lessonId}`)
      .set('X-CSRF-Token', ulcsrf)
      .send({ title: 'Lesson 1 updated' });
    expect(upLesson.status).toBe(200);
    expect(upLesson.body.data.lesson.title).toBe('Lesson 1 updated');

    // delete lesson
    const dlcsrf = await getCsrf(teacherAgent);
    const delLesson = await teacherAgent
      .delete(`/api/v1/teacher/lessons/${lessonId}`)
      .set('X-CSRF-Token', dlcsrf);
    expect(delLesson.status).toBe(200);
  });

  it('handles media upload, access control, and deletion', async () => {
    const adminAgent = request.agent(app);
    await registerUser(adminAgent, 'admin4@example.com');
    await promoteAdmin(prisma, 'admin4@example.com');
    const loginCsrf = await getCsrf(adminAgent);
    await adminAgent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', loginCsrf)
      .send({ email: 'admin4@example.com', password: 'password123' });

    const teacherAgent = await approveTeacher(app, adminAgent, 'teacher4@example.com');

    // upload a small png
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const upcsrf = await getCsrf(teacherAgent);
    const upRes = await teacherAgent
      .post('/api/v1/teacher/media')
      .set('X-CSRF-Token', upcsrf)
      .attach('file', buf, { filename: 'pic.png', contentType: 'image/png' });
    expect(upRes.status).toBe(201);
    const mediaId = upRes.body.data.media.id as string;

    // owner can download
    const downRes = await teacherAgent.get(`/api/v1/teacher/media/${mediaId}`);
    expect(downRes.status).toBe(200);
    expect(downRes.headers['content-type']).toContain('image/png');

    // unrelated student cannot download
    const otherAgent = request.agent(app);
    await registerUser(otherAgent, 'stranger@example.com');
    const strangerRes = await otherAgent.get(`/api/v1/teacher/media/${mediaId}`);
    expect(strangerRes.status).toBe(403);

    // admin can download
    const adminDown = await adminAgent.get(`/api/v1/teacher/media/${mediaId}`);
    expect(adminDown.status).toBe(200);

    // reject unsupported type
    const badcsrf = await getCsrf(teacherAgent);
    const badRes = await teacherAgent
      .post('/api/v1/teacher/media')
      .set('X-CSRF-Token', badcsrf)
      .attach('file', Buffer.from('hello'), {
        filename: 'x.txt',
        contentType: 'text/plain',
      });
    expect(badRes.status).toBe(422);

    // delete
    const delcsrf = await getCsrf(teacherAgent);
    const delRes = await teacherAgent
      .delete(`/api/v1/teacher/media/${mediaId}`)
      .set('X-CSRF-Token', delcsrf);
    expect(delRes.status).toBe(200);

    const afterDel = await teacherAgent.get(`/api/v1/teacher/media/${mediaId}`);
    expect(afterDel.status).toBe(404);
  });

  it('validates course input', async () => {
    const adminAgent = request.agent(app);
    await registerUser(adminAgent, 'admin5@example.com');
    await promoteAdmin(prisma, 'admin5@example.com');
    const loginCsrf = await getCsrf(adminAgent);
    await adminAgent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', loginCsrf)
      .send({ email: 'admin5@example.com', password: 'password123' });
    const teacherAgent = await approveTeacher(app, adminAgent, 'teacher5@example.com');

    const csrf = await getCsrf(teacherAgent);
    const res = await teacherAgent
      .post('/api/v1/teacher/courses')
      .set('X-CSRF-Token', csrf)
      .send({ title: '', priceMmk: -5 });
    expect(res.status).toBe(422);
  });
});
