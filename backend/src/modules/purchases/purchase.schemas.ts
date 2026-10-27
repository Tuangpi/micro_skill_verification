import { z } from 'zod';

export const createPurchaseSchema = z
  .object({
    courseId: z.string().uuid().optional(),
    slug: z.string().trim().min(1).max(220).optional(),
  })
  .refine((v) => v.courseId || v.slug, {
    message: 'courseId or slug is required',
  });

export const createPaymentSubmissionSchema = z.object({
  provider: z.enum(['KBZPAY', 'WAVEPAY']),
  transactionReference: z.string().trim().min(1).max(120),
  receiptMediaId: z.string().uuid().optional().nullable(),
});

export const paymentSubmissionReviewSchema = z.object({
  note: z.string().trim().max(1000).optional().nullable(),
});

export const paymentSubmissionStatusFilterSchema = z
  .object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional() })
  .optional();

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type CreatePaymentSubmissionInput = z.infer<typeof createPaymentSubmissionSchema>;
