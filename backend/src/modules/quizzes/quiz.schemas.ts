import { z } from 'zod';

export const createQuizSchema = z.object({
  title: z.string().trim().min(1).max(200),
  passMarkPercent: z.coerce.number().int().min(0).max(100).optional(),
  maxAttempts: z.coerce.number().int().min(1).max(100).optional().nullable(),
});

export const updateQuizSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  passMarkPercent: z.coerce.number().int().min(0).max(100).optional(),
  maxAttempts: z.coerce.number().int().min(1).max(100).optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export const createQuestionSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  options: z.array(z.string().trim().min(1).max(500)).min(2).max(8),
  correctOption: z.coerce.number().int().min(0),
  position: z.coerce.number().int().min(0).optional(),
});

export const submitAttemptSchema = z.object({
  answers: z.record(z.string(), z.coerce.number().int().min(0)),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
