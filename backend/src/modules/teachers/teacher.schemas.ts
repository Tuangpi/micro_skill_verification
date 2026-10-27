import { z } from 'zod';

export const teacherApplicationInputSchema = z.object({
  bio: z.string().trim().max(2000).optional().nullable(),
  expertise: z.string().trim().max(255).optional().nullable(),
  portfolioUrl: z.string().trim().max(500).optional().nullable(),
});

export const teacherApplicationReviewSchema = z.object({
  note: z.string().trim().max(2000).optional().nullable(),
});

export const teacherApplicationStatusFilterSchema = z
  .object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  })
  .optional();

export type TeacherApplicationInput = z.infer<typeof teacherApplicationInputSchema>;
export type TeacherApplicationReviewInput = z.infer<
  typeof teacherApplicationReviewSchema
>;
