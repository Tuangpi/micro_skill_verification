import type { PrismaClient } from '../../shared/database/prisma.js';
import type { AppLogger } from '../../shared/logger/logger.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors/app-error.js';
import type { FileStorage } from '../../shared/storage/file-storage.js';
import {
  createPurchaseSchema,
  createPaymentSubmissionSchema,
  paymentSubmissionReviewSchema,
} from './purchase.schemas.js';

export type PurchaseStatus = 'PENDING' | 'PAYMENT_SUBMITTED' | 'APPROVED' | 'REJECTED';
export type PaymentProvider = 'KBZPAY' | 'WAVEPAY';
export type PaymentSubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type PurchaseView = {
  id: string;
  studentId: string;
  courseId: string;
  priceMmk: number;
  status: PurchaseStatus;
  createdAt: string;
  updatedAt: string;
};

export type PaymentSubmissionView = {
  id: string;
  purchaseId: string;
  submittedById: string;
  provider: PaymentProvider;
  transactionReference: string;
  receiptMediaId: string | null;
  status: PaymentSubmissionStatus;
  reviewNote: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EnrollmentView = {
  id: string;
  studentId: string;
  courseId: string;
  purchaseId: string;
  createdAt: string;
};

export type PaymentInstructions = {
  amountMmk: number;
  currency: string;
  reference: string;
  providers: {
    provider: PaymentProvider;
    name: string;
    accountName: string | null;
    accountNumber: string | null;
    instructions: string;
  }[];
};

export type PurchaseService = {
  createPurchase: (
    userId: string,
    input: unknown,
  ) => Promise<{ purchase: PurchaseView; paymentInstructions: PaymentInstructions }>;
  listMyPurchases: (userId: string) => Promise<PurchaseView[]>;
  getPurchase: (userId: string, role: string, id: string) => Promise<PurchaseView>;
  createPaymentSubmission: (
    userId: string,
    purchaseId: string,
    input: unknown,
    file?: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) => Promise<PaymentSubmissionView>;
  listPaymentSubmissions: (
    status?: PaymentSubmissionStatus,
  ) => Promise<PaymentSubmissionView[]>;
  getPaymentSubmission: (id: string) => Promise<PaymentSubmissionView>;
  approvePaymentSubmission: (
    adminId: string,
    id: string,
    input: unknown,
  ) => Promise<PaymentSubmissionView>;
  rejectPaymentSubmission: (
    adminId: string,
    id: string,
    input: unknown,
  ) => Promise<PaymentSubmissionView>;
  listMyEnrollments: (userId: string) => Promise<EnrollmentView[]>;
  isEnrolled: (userId: string, courseId: string) => Promise<boolean>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPurchaseView(r: any): PurchaseView {
  return {
    id: r.id,
    studentId: r.studentId,
    courseId: r.courseId,
    priceMmk: r.priceMmk,
    status: r.status as PurchaseStatus,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSubmissionView(r: any): PaymentSubmissionView {
  return {
    id: r.id,
    purchaseId: r.purchaseId,
    submittedById: r.submittedById,
    provider: r.provider as PaymentProvider,
    transactionReference: r.transactionReference,
    receiptMediaId: r.receiptMediaId ?? null,
    status: r.status as PaymentSubmissionStatus,
    reviewNote: r.reviewNote ?? null,
    reviewedById: r.reviewedById ?? null,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toEnrollmentView(r: any): EnrollmentView {
  return {
    id: r.id,
    studentId: r.studentId,
    courseId: r.courseId,
    purchaseId: r.purchaseId,
    createdAt: r.createdAt.toISOString(),
  };
}

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function createPurchaseService(
  prisma: PrismaClient,
  _logger: AppLogger,
  storage: FileStorage,
): PurchaseService {
  async function loadPurchase(id: string) {
    const purchase = await prisma.purchase.findUnique({ where: { id } });
    if (!purchase) throw new NotFoundError('Purchase not found');
    return purchase;
  }

  async function createPurchase(userId: string, input: unknown) {
    const parsed = createPurchaseSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;

    const course = data.courseId
      ? await prisma.course.findUnique({ where: { id: data.courseId } })
      : data.slug
        ? await prisma.course.findUnique({ where: { slug: data.slug } })
        : null;
    if (!course || course.status !== 'PUBLISHED')
      throw new NotFoundError('Course not found');

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: userId, courseId: course.id } },
    });
    if (existingEnrollment)
      throw new ConflictError('You are already enrolled in this course');

    const purchase = await prisma.purchase.create({
      data: {
        studentId: userId,
        courseId: course.id,
        priceMmk: course.priceMmk,
        status: 'PENDING',
      },
    });

    const paymentInstructions: PaymentInstructions = {
      amountMmk: course.priceMmk,
      currency: 'MMK',
      reference: purchase.id,
      providers: [
        {
          provider: 'KBZPAY',
          name: 'KBZPay',
          accountName: null,
          accountNumber: null,
          instructions:
            'Pay the exact amount and use the purchase reference. Operator supplies recipient details.',
        },
        {
          provider: 'WAVEPAY',
          name: 'WavePay',
          accountName: null,
          accountNumber: null,
          instructions:
            'Pay the exact amount and use the purchase reference. Operator supplies recipient details.',
        },
      ],
    };

    return { purchase: toPurchaseView(purchase), paymentInstructions };
  }

  async function listMyPurchases(userId: string) {
    const list = await prisma.purchase.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return list.map(toPurchaseView);
  }

  async function getPurchase(userId: string, role: string, id: string) {
    const purchase = await loadPurchase(id);
    if (role !== 'ADMIN' && purchase.studentId !== userId)
      throw new ForbiddenError('You do not have access to this purchase');
    return toPurchaseView(purchase);
  }

  async function createPaymentSubmission(
    userId: string,
    purchaseId: string,
    input: unknown,
    file?: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    const purchase = await loadPurchase(purchaseId);
    if (purchase.studentId !== userId)
      throw new ForbiddenError('You do not own this purchase');
    if (purchase.status === 'APPROVED')
      throw new ConflictError('Purchase already approved');

    const parsed = createPaymentSubmissionSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;

    let receiptMediaId = data.receiptMediaId ?? null;
    if (file) {
      if (!ALLOWED_MIME.has(file.mimetype))
        throw new ValidationError('Unsupported file type', { mimetype: file.mimetype });
      if (file.size > MAX_UPLOAD_BYTES)
        throw new ValidationError('File too large', { maxBytes: MAX_UPLOAD_BYTES });
      const stored = await storage.save(file.buffer, {
        mimeType: file.mimetype,
        originalName: file.originalname,
      });
      const asset = await prisma.mediaAsset.create({
        data: {
          ownerId: userId,
          storageKey: stored.storageKey,
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          kind: (file.mimetype.startsWith('image/')
            ? 'IMAGE'
            : file.mimetype === 'application/pdf'
              ? 'DOCUMENT'
              : 'OTHER') as 'IMAGE' | 'DOCUMENT' | 'OTHER',
        },
      });
      receiptMediaId = asset.id;
    }

    if (receiptMediaId && !file) {
      const asset = await prisma.mediaAsset.findUnique({ where: { id: receiptMediaId } });
      if (!asset || asset.ownerId !== userId)
        throw new ForbiddenError('You do not have access to this receipt');
    }

    const existingRef = await prisma.paymentSubmission.findUnique({
      where: { transactionReference: data.transactionReference },
    });
    if (existingRef) throw new ConflictError('Transaction reference already used');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let submission: any;
    try {
      submission = await prisma.$transaction(async (tx) => {
        const s = await tx.paymentSubmission.create({
          data: {
            purchaseId,
            submittedById: userId,
            provider: data.provider as 'KBZPAY' | 'WAVEPAY',
            transactionReference: data.transactionReference,
            receiptMediaId,
            status: 'PENDING',
          },
        });
        await tx.purchase.update({
          where: { id: purchaseId },
          data: { status: 'PAYMENT_SUBMITTED' },
        });
        return s;
      });
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: string }).code === 'P2002'
      ) {
        throw new ConflictError('Transaction reference already used');
      }
      throw err;
    }

    return toSubmissionView(submission);
  }

  async function listPaymentSubmissions(status?: PaymentSubmissionStatus) {
    const list = await prisma.paymentSubmission.findMany({
      where: status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' } : {},
      orderBy: { createdAt: 'desc' },
    });
    return list.map(toSubmissionView);
  }

  async function getPaymentSubmission(id: string) {
    const s = await prisma.paymentSubmission.findUnique({ where: { id } });
    if (!s) throw new NotFoundError('Payment submission not found');
    return toSubmissionView(s);
  }

  async function approvePaymentSubmission(adminId: string, id: string, input: unknown) {
    const parsed = paymentSubmissionReviewSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;

    const submission = await prisma.paymentSubmission.findUnique({
      where: { id },
      include: { purchase: true },
    });
    if (!submission) throw new NotFoundError('Payment submission not found');
    if (submission.status !== 'PENDING')
      throw new ConflictError('Only pending submissions can be approved');
    if (!submission.purchase || submission.purchase.status === 'APPROVED')
      throw new ConflictError('Purchase already approved');

    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.paymentSubmission.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedById: adminId,
          reviewNote: data.note ?? null,
        },
      });
      await tx.purchase.update({
        where: { id: submission.purchaseId },
        data: { status: 'APPROVED' },
      });
      await tx.enrollment.upsert({
        where: { purchaseId: submission.purchaseId },
        create: {
          studentId: submission.purchase.studentId,
          courseId: submission.purchase.courseId,
          purchaseId: submission.purchaseId,
        },
        update: {},
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'PAYMENT_APPROVED',
          targetType: 'PaymentSubmission',
          targetId: id,
          metadata: {
            purchaseId: submission.purchaseId,
            studentId: submission.purchase.studentId,
            courseId: submission.purchase.courseId,
          },
        },
      });
      return s;
    });

    return toSubmissionView(updated);
  }

  async function rejectPaymentSubmission(adminId: string, id: string, input: unknown) {
    const parsed = paymentSubmissionReviewSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;

    const submission = await prisma.paymentSubmission.findUnique({
      where: { id },
      include: { purchase: true },
    });
    if (!submission) throw new NotFoundError('Payment submission not found');
    if (submission.status !== 'PENDING')
      throw new ConflictError('Only pending submissions can be rejected');

    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.paymentSubmission.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewedById: adminId,
          reviewNote: data.note ?? null,
        },
      });
      await tx.purchase.update({
        where: { id: submission.purchaseId },
        data: { status: 'REJECTED' },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'PAYMENT_REJECTED',
          targetType: 'PaymentSubmission',
          targetId: id,
          metadata: {
            purchaseId: submission.purchaseId,
            note: data.note ?? null,
          },
        },
      });
      return s;
    });

    return toSubmissionView(updated);
  }

  async function listMyEnrollments(userId: string) {
    const list = await prisma.enrollment.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return list.map(toEnrollmentView);
  }

  async function isEnrolled(userId: string, courseId: string) {
    const e = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: userId, courseId } },
    });
    return !!e;
  }

  return {
    createPurchase,
    listMyPurchases,
    getPurchase,
    createPaymentSubmission,
    listPaymentSubmissions,
    getPaymentSubmission,
    approvePaymentSubmission,
    rejectPaymentSubmission,
    listMyEnrollments,
    isEnrolled,
  };
}
