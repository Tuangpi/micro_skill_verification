import { z } from 'zod';

export const createPayoutRequestSchema = z.object({
  amountMmk: z.number().int().positive(),
  note: z.string().trim().max(1000).optional().nullable(),
});

export const payoutReviewSchema = z.object({
  note: z.string().trim().max(1000).optional().nullable(),
});

export const recordPaymentSchema = z.object({
  reference: z.string().trim().min(1).max(120),
  note: z.string().trim().max(1000).optional().nullable(),
});
