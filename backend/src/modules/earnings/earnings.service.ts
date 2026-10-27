import type { PrismaClient } from '../../shared/database/prisma.js';
import type { AppLogger } from '../../shared/logger/logger.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors/app-error.js';
import { adjustmentSchema, type AdjustmentInput } from './earnings.schemas.js';

// Platform commission applied to approved course sales. Expressed in basis
// points (1/10000). 2000 bps = 20%. This is a documented default pending
// operator confirmation of the final commission policy (see T010).
export const PLATFORM_COMMISSION_BPS = 2000;

export type EarningType = 'SALE' | 'REFUND' | 'ADJUSTMENT';

export type EarningView = {
  id: string;
  teacherId: string;
  teacherName?: string;
  courseId: string | null;
  courseTitle: string | null;
  purchaseId: string | null;
  type: EarningType;
  grossAmountMmk: number;
  commissionRateBps: number;
  commissionAmountMmk: number;
  amountMmk: number;
  note: string | null;
  createdAt: string;
};

export type TeacherEarningsSummary = {
  teacherId: string;
  balanceMmk: number;
  totalEarnedMmk: number;
  totalCommissionMmk: number;
  entryCount: number;
  entries: EarningView[];
};

export type EarningsService = {
  getTeacherEarnings: (
    userId: string,
    role: string,
    targetTeacherId?: string,
  ) => Promise<TeacherEarningsSummary>;
  listAllEarnings: (filters?: {
    teacherId?: string;
    type?: EarningType;
  }) => Promise<EarningView[]>;
  createAdjustment: (adminId: string, input: unknown) => Promise<EarningView>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toEarningView(r: any): EarningView {
  return {
    id: r.id,
    teacherId: r.teacherId,
    teacherName: r.teacher?.name,
    courseId: r.courseId ?? null,
    courseTitle: r.course?.title ?? null,
    purchaseId: r.purchaseId ?? null,
    type: r.type as EarningType,
    grossAmountMmk: r.grossAmountMmk,
    commissionRateBps: r.commissionRateBps,
    commissionAmountMmk: r.commissionAmountMmk,
    amountMmk: r.amountMmk,
    note: r.note ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

export function createEarningsService(
  prisma: PrismaClient,
  _logger: AppLogger,
): EarningsService {
  async function getTeacherEarnings(
    userId: string,
    role: string,
    targetTeacherId?: string,
  ): Promise<TeacherEarningsSummary> {
    const teacherId = role === 'ADMIN' && targetTeacherId ? targetTeacherId : userId;
    if (role !== 'ADMIN' && targetTeacherId && targetTeacherId !== userId) {
      throw new ForbiddenError("You cannot view another teacher's earnings");
    }
    if (role !== 'ADMIN' && role !== 'TEACHER') {
      throw new ForbiddenError('Only teachers can view earnings');
    }

    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacher) throw new NotFoundError('Teacher not found');

    const entries = await prisma.teacherEarning.findMany({
      where: { teacherId },
      include: { course: true, teacher: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    let balanceMmk = 0;
    let totalEarnedMmk = 0;
    let totalCommissionMmk = 0;
    for (const e of entries) {
      balanceMmk += e.amountMmk;
      if (e.type === 'SALE') {
        totalEarnedMmk += e.grossAmountMmk;
        totalCommissionMmk += e.commissionAmountMmk;
      }
    }

    return {
      teacherId,
      balanceMmk,
      totalEarnedMmk,
      totalCommissionMmk,
      entryCount: entries.length,
      entries: entries.map(toEarningView),
    };
  }

  async function listAllEarnings(filters?: {
    teacherId?: string;
    type?: EarningType;
  }): Promise<EarningView[]> {
    const where: Record<string, unknown> = {};
    if (filters?.teacherId) where.teacherId = filters.teacherId;
    if (filters?.type) where.type = filters.type;
    const entries = await prisma.teacherEarning.findMany({
      where,
      include: { course: true, teacher: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return entries.map(toEarningView);
  }

  async function createAdjustment(adminId: string, input: unknown): Promise<EarningView> {
    const parsed = adjustmentSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data as AdjustmentInput;

    const teacher = await prisma.user.findUnique({ where: { id: data.teacherId } });
    if (!teacher) throw new NotFoundError('Teacher not found');

    if (data.courseId) {
      const course = await prisma.course.findUnique({ where: { id: data.courseId } });
      if (!course) throw new NotFoundError('Course not found');
      if (course.teacherId !== data.teacherId)
        throw new ValidationError('Course does not belong to teacher');
    }
    if (data.purchaseId) {
      const purchase = await prisma.purchase.findUnique({
        where: { id: data.purchaseId },
        include: { course: true },
      });
      if (!purchase) throw new NotFoundError('Purchase not found');
      if (purchase.course && purchase.course.teacherId !== data.teacherId)
        throw new ValidationError('Purchase does not belong to teacher');
    }

    const created = await prisma.$transaction(async (tx) => {
      const entry = await tx.teacherEarning.create({
        data: {
          teacherId: data.teacherId,
          courseId: data.courseId ?? null,
          purchaseId: data.purchaseId ?? null,
          type: 'ADJUSTMENT',
          grossAmountMmk: 0,
          commissionRateBps: 0,
          commissionAmountMmk: 0,
          amountMmk: data.amountMmk,
          note: data.note,
          createdById: adminId,
        },
        include: { course: true, teacher: { select: { name: true } } },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'TEACHER_EARNING_ADJUSTMENT',
          targetType: 'TeacherEarning',
          targetId: entry.id,
          metadata: {
            teacherId: data.teacherId,
            amountMmk: data.amountMmk,
            note: data.note,
          },
        },
      });
      return entry;
    });

    return toEarningView(created);
  }

  return {
    getTeacherEarnings,
    listAllEarnings,
    createAdjustment,
  };
}
