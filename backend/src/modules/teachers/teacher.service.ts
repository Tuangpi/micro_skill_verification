import type { PrismaClient } from '../../shared/database/prisma.js';
import type { AppLogger } from '../../shared/logger/logger.js';
import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors/app-error.js';
import {
  teacherApplicationInputSchema,
  teacherApplicationReviewSchema,
} from './teacher.schemas.js';

export type TeacherApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type TeacherApplicationView = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  bio: string | null;
  expertise: string | null;
  portfolioUrl: string | null;
  status: TeacherApplicationStatus;
  appliedAt: string;
  reviewedAt: string | null;
  reviewedById: string | null;
  reviewNote: string | null;
};

export type TeacherService = {
  submitApplication: (userId: string, input: unknown) => Promise<TeacherApplicationView>;
  getMyApplication: (userId: string) => Promise<TeacherApplicationView | null>;
  listApplications: (
    status?: TeacherApplicationStatus,
  ) => Promise<TeacherApplicationView[]>;
  getApplication: (id: string) => Promise<TeacherApplicationView>;
  approveApplication: (
    adminId: string,
    id: string,
    input: unknown,
  ) => Promise<TeacherApplicationView>;
  rejectApplication: (
    adminId: string,
    id: string,
    input: unknown,
  ) => Promise<TeacherApplicationView>;
  isApprovedTeacher: (userId: string) => Promise<boolean>;
};

function toView(record: {
  id: string;
  userId: string;
  bio: string | null;
  expertise: string | null;
  portfolioUrl: string | null;
  status: string;
  appliedAt: Date;
  reviewedAt: Date | null;
  reviewedById: string | null;
  reviewNote: string | null;
  user: { name: string; email: string };
}): TeacherApplicationView {
  return {
    id: record.id,
    userId: record.userId,
    userName: record.user.name,
    userEmail: record.user.email,
    bio: record.bio,
    expertise: record.expertise,
    portfolioUrl: record.portfolioUrl,
    status: record.status as TeacherApplicationStatus,
    appliedAt: record.appliedAt.toISOString(),
    reviewedAt: record.reviewedAt ? record.reviewedAt.toISOString() : null,
    reviewedById: record.reviewedById,
    reviewNote: record.reviewNote,
  };
}

const includeUser = { user: { select: { name: true, email: true } } } as const;

export function createTeacherService(
  prisma: PrismaClient,
  _logger: AppLogger,
): TeacherService {
  async function submitApplication(userId: string, input: unknown) {
    const parsed = teacherApplicationInputSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new AppError('UNAUTHORIZED', 'Account not found');

    const existing = await prisma.teacherProfile.findUnique({
      where: { userId },
      include: includeUser,
    });

    if (existing) {
      if (existing.status === 'APPROVED')
        throw new ConflictError('You are already an approved teacher');
      if (existing.status === 'PENDING')
        throw new ConflictError('Your teacher application is already pending review');
      const updated = await prisma.teacherProfile.update({
        where: { id: existing.id },
        data: {
          bio: data.bio ?? null,
          expertise: data.expertise ?? null,
          portfolioUrl: data.portfolioUrl ?? null,
          status: 'PENDING',
          appliedAt: new Date(),
          reviewedAt: null,
          reviewedById: null,
          reviewNote: null,
        },
        include: includeUser,
      });
      return toView(updated);
    }

    const created = await prisma.teacherProfile.create({
      data: {
        userId,
        bio: data.bio ?? null,
        expertise: data.expertise ?? null,
        portfolioUrl: data.portfolioUrl ?? null,
        status: 'PENDING',
      },
      include: includeUser,
    });
    return toView(created);
  }

  async function getMyApplication(userId: string) {
    const record = await prisma.teacherProfile.findUnique({
      where: { userId },
      include: includeUser,
    });
    if (!record) return null;
    return toView(record);
  }

  async function listApplications(status?: TeacherApplicationStatus) {
    const records = await prisma.teacherProfile.findMany({
      ...(status ? { where: { status } } : {}),
      include: includeUser,
      orderBy: { appliedAt: 'desc' },
    });
    return records.map((r) => toView(r as never));
  }

  async function getApplication(id: string) {
    const record = await prisma.teacherProfile.findUnique({
      where: { id },
      include: includeUser,
    });
    if (!record) throw new NotFoundError('Teacher application not found');
    return toView(record);
  }

  async function approveApplication(adminId: string, id: string, input: unknown) {
    const parsed = teacherApplicationReviewSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;

    const profile = await prisma.teacherProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundError('Teacher application not found');
    if (profile.status !== 'PENDING')
      throw new ConflictError('Only pending applications can be approved');

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.teacherProfile.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedById: adminId,
          reviewNote: data.note ?? null,
        },
        include: includeUser,
      });
      await tx.user.update({ where: { id: profile.userId }, data: { role: 'TEACHER' } });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'TEACHER_APPLICATION_APPROVED',
          targetType: 'TeacherProfile',
          targetId: id,
          metadata: { userId: profile.userId, note: data.note ?? null },
        },
      });
      return p;
    });
    return toView(updated);
  }

  async function rejectApplication(adminId: string, id: string, input: unknown) {
    const parsed = teacherApplicationReviewSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;

    const profile = await prisma.teacherProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundError('Teacher application not found');
    if (profile.status !== 'PENDING')
      throw new ConflictError('Only pending applications can be rejected');

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.teacherProfile.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewedById: adminId,
          reviewNote: data.note ?? null,
        },
        include: includeUser,
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'TEACHER_APPLICATION_REJECTED',
          targetType: 'TeacherProfile',
          targetId: id,
          metadata: { userId: profile.userId, note: data.note ?? null },
        },
      });
      return p;
    });
    return toView(updated);
  }

  async function isApprovedTeacher(userId: string) {
    const profile = await prisma.teacherProfile.findUnique({ where: { userId } });
    return profile?.status === 'APPROVED';
  }

  return {
    submitApplication,
    getMyApplication,
    listApplications,
    getApplication,
    approveApplication,
    rejectApplication,
    isApprovedTeacher,
  };
}
