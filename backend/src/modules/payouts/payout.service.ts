import type { PrismaClient } from '../../shared/database/prisma.js';
import type { AppLogger } from '../../shared/logger/logger.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors/app-error.js';
import {
  createPayoutRequestSchema,
  payoutReviewSchema,
  recordPaymentSchema,
} from './payout.schemas.js';

export type PayoutRequestStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PAID';

export type PayoutRequestView = {
  id: string;
  teacherId: string;
  teacherName?: string;
  amountMmk: number;
  status: PayoutRequestStatus;
  note: string | null;
  reviewNote: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PayoutTransactionView = {
  id: string;
  payoutRequestId: string;
  recordedById: string;
  amountMmk: number;
  reference: string;
  note: string | null;
  paidAt: string;
  createdAt: string;
};

export type FinancialReport = {
  totalEarnedMmk: number;
  totalCommissionMmk: number;
  teacherBalanceMmk: number;
  totalPaidOutMmk: number;
  pendingPayoutMmk: number;
  availablePayoutMmk: number;
};

export type PayoutService = {
  createPayoutRequest: (teacherId: string, input: unknown) => Promise<PayoutRequestView>;
  listMyPayoutRequests: (teacherId: string) => Promise<PayoutRequestView[]>;
  getPayoutRequest: (id: string) => Promise<PayoutRequestView>;
  listPayoutRequests: (filters?: {
    status?: PayoutRequestStatus;
    teacherId?: string;
  }) => Promise<PayoutRequestView[]>;
  approvePayoutRequest: (
    adminId: string,
    id: string,
    input: unknown,
  ) => Promise<PayoutRequestView>;
  rejectPayoutRequest: (
    adminId: string,
    id: string,
    input: unknown,
  ) => Promise<PayoutRequestView>;
  recordPayout: (
    adminId: string,
    id: string,
    input: unknown,
  ) => Promise<PayoutTransactionView>;
  getFinancialReport: () => Promise<FinancialReport>;
  getAvailableBalance: (teacherId: string) => Promise<number>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRequestView(r: any): PayoutRequestView {
  return {
    id: r.id,
    teacherId: r.teacherId,
    teacherName: r.teacher?.name,
    amountMmk: r.amountMmk,
    status: r.status as PayoutRequestStatus,
    note: r.note ?? null,
    reviewNote: r.reviewNote ?? null,
    reviewedById: r.reviewedById ?? null,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTransactionView(r: any): PayoutTransactionView {
  return {
    id: r.id,
    payoutRequestId: r.payoutRequestId,
    recordedById: r.recordedById,
    amountMmk: r.amountMmk,
    reference: r.reference,
    note: r.note ?? null,
    paidAt: r.paidAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  };
}

export function createPayoutService(
  prisma: PrismaClient,
  _logger: AppLogger,
): PayoutService {
  async function computeBalance(teacherId: string): Promise<number> {
    const entries = await prisma.teacherEarning.findMany({
      where: { teacherId },
      select: { amountMmk: true },
    });
    return entries.reduce((sum, e) => sum + e.amountMmk, 0);
  }

  async function computePendingPayouts(
    teacherId: string,
    excludeRequestId?: string,
  ): Promise<number> {
    const rows = await prisma.payoutRequest.findMany({
      where: {
        teacherId,
        status: { in: ['REQUESTED', 'APPROVED'] },
        ...(excludeRequestId ? { id: { not: excludeRequestId } } : {}),
      },
      select: { amountMmk: true },
    });
    return rows.reduce((sum, r) => sum + r.amountMmk, 0);
  }

  async function getAvailableBalance(teacherId: string): Promise<number> {
    const balance = await computeBalance(teacherId);
    const pending = await computePendingPayouts(teacherId);
    return balance - pending;
  }

  async function createPayoutRequest(teacherId: string, input: unknown) {
    const parsed = createPayoutRequestSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;

    const user = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!user) throw new NotFoundError('User not found');

    const available = await getAvailableBalance(teacherId);
    if (data.amountMmk > available)
      throw new ValidationError(
        `Requested amount exceeds available balance (${available} MMK)`,
      );

    const created = await prisma.payoutRequest.create({
      data: {
        teacherId,
        amountMmk: data.amountMmk,
        note: data.note ?? null,
        status: 'REQUESTED',
      },
      include: { teacher: { select: { name: true } } },
    });
    return toRequestView(created);
  }

  async function listMyPayoutRequests(teacherId: string) {
    const rows = await prisma.payoutRequest.findMany({
      where: { teacherId },
      include: { teacher: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toRequestView);
  }

  async function getPayoutRequest(id: string) {
    const row = await prisma.payoutRequest.findUnique({
      where: { id },
      include: { teacher: { select: { name: true } } },
    });
    if (!row) throw new NotFoundError('Payout request not found');
    return toRequestView(row);
  }

  async function listPayoutRequests(filters?: {
    status?: PayoutRequestStatus;
    teacherId?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.teacherId) where.teacherId = filters.teacherId;
    const rows = await prisma.payoutRequest.findMany({
      where,
      include: { teacher: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toRequestView);
  }

  async function approvePayoutRequest(adminId: string, id: string, input: unknown) {
    const parsed = payoutReviewSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;

    const row = await prisma.payoutRequest.findUnique({ where: { id } });
    if (!row) throw new NotFoundError('Payout request not found');
    if (row.status !== 'REQUESTED')
      throw new ConflictError('Only requested payouts can be approved');

    const updated = await prisma.payoutRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedById: adminId,
        reviewNote: data.note ?? null,
      },
      include: { teacher: { select: { name: true } } },
    });
    await prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'PAYOUT_REQUEST_APPROVED',
        targetType: 'PayoutRequest',
        targetId: id,
        metadata: { amountMmk: row.amountMmk, teacherId: row.teacherId },
      },
    });
    return toRequestView(updated);
  }

  async function rejectPayoutRequest(adminId: string, id: string, input: unknown) {
    const parsed = payoutReviewSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;

    const row = await prisma.payoutRequest.findUnique({ where: { id } });
    if (!row) throw new NotFoundError('Payout request not found');
    if (row.status !== 'REQUESTED' && row.status !== 'APPROVED')
      throw new ConflictError('Only requested or approved payouts can be rejected');

    const updated = await prisma.payoutRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedById: adminId,
        reviewNote: data.note ?? null,
      },
      include: { teacher: { select: { name: true } } },
    });
    await prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'PAYOUT_REQUEST_REJECTED',
        targetType: 'PayoutRequest',
        targetId: id,
        metadata: { amountMmk: row.amountMmk, teacherId: row.teacherId },
      },
    });
    return toRequestView(updated);
  }

  async function recordPayout(adminId: string, id: string, input: unknown) {
    const parsed = recordPaymentSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;

    const row = await prisma.payoutRequest.findUnique({ where: { id } });
    if (!row) throw new NotFoundError('Payout request not found');
    if (row.status !== 'REQUESTED' && row.status !== 'APPROVED')
      throw new ConflictError('Only requested or approved payouts can be recorded');

    const otherPending = await computePendingPayouts(row.teacherId, id);
    const balance = await computeBalance(row.teacherId);
    if (row.amountMmk > balance - otherPending)
      throw new ValidationError('Insufficient available balance for payout');

    try {
      const result = await prisma.$transaction(async (tx) => {
        const claim = await tx.payoutRequest.updateMany({
          where: { id, status: { in: ['REQUESTED', 'APPROVED'] } },
          data: {
            status: 'PAID',
            reviewedAt: new Date(),
            reviewedById: adminId,
            reviewNote: data.note ?? null,
          },
        });
        if (claim.count !== 1)
          throw new ConflictError('Payout request is no longer payable');

        const txn = await tx.payoutTransaction.create({
          data: {
            payoutRequestId: id,
            recordedById: adminId,
            amountMmk: row.amountMmk,
            reference: data.reference,
            note: data.note ?? null,
          },
        });

        await tx.teacherEarning.create({
          data: {
            teacherId: row.teacherId,
            type: 'PAYOUT',
            grossAmountMmk: 0,
            commissionRateBps: 0,
            commissionAmountMmk: 0,
            amountMmk: -row.amountMmk,
            payoutRequestId: id,
            note: data.note ?? `Payout ${data.reference}`,
            createdById: adminId,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: adminId,
            action: 'PAYOUT_RECORDED',
            targetType: 'PayoutRequest',
            targetId: id,
            metadata: {
              teacherId: row.teacherId,
              amountMmk: row.amountMmk,
              reference: data.reference,
            },
          },
        });

        return txn;
      });
      return toTransactionView(result);
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: string }).code === 'P2002'
      ) {
        throw new ConflictError('Payout reference already used');
      }
      throw err;
    }
  }

  async function getFinancialReport(): Promise<FinancialReport> {
    const earnings = await prisma.teacherEarning.findMany({
      select: {
        type: true,
        amountMmk: true,
        grossAmountMmk: true,
        commissionAmountMmk: true,
      },
    });
    let totalEarnedMmk = 0;
    let totalCommissionMmk = 0;
    let teacherBalanceMmk = 0;
    let totalPaidOutMmk = 0;
    for (const e of earnings) {
      teacherBalanceMmk += e.amountMmk;
      if (e.type === 'SALE') {
        totalEarnedMmk += e.grossAmountMmk;
        totalCommissionMmk += e.commissionAmountMmk;
      }
      if (e.type === 'PAYOUT') {
        totalPaidOutMmk += -e.amountMmk;
      }
    }
    const pendingRows = await prisma.payoutRequest.findMany({
      where: { status: { in: ['REQUESTED', 'APPROVED'] } },
      select: { amountMmk: true },
    });
    const pendingPayoutMmk = pendingRows.reduce((s, r) => s + r.amountMmk, 0);
    return {
      totalEarnedMmk,
      totalCommissionMmk,
      teacherBalanceMmk,
      totalPaidOutMmk,
      pendingPayoutMmk,
      availablePayoutMmk: teacherBalanceMmk - pendingPayoutMmk,
    };
  }

  return {
    createPayoutRequest,
    listMyPayoutRequests,
    getPayoutRequest,
    listPayoutRequests,
    approvePayoutRequest,
    rejectPayoutRequest,
    recordPayout,
    getFinancialReport,
    getAvailableBalance,
  };
}
