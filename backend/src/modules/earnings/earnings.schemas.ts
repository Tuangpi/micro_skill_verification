import { z } from 'zod';

export const adjustmentSchema = z.object({
  teacherId: z.string().uuid(),
  amountMmk: z
    .number()
    .int()
    .refine((v) => v !== 0, {
      message: 'amountMmk must be a non-zero integer',
    }),
  note: z.string().trim().min(1).max(1000),
  courseId: z.string().uuid().optional().nullable(),
  purchaseId: z.string().uuid().optional().nullable(),
});

export const earningsFilterSchema = z
  .object({
    teacherId: z.string().uuid().optional(),
    type: z.enum(['SALE', 'REFUND', 'ADJUSTMENT']).optional(),
  })
  .optional();

export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
