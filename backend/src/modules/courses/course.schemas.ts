import { z } from 'zod';

export const courseStatusEnum = z.enum(['DRAFT', 'SUBMITTED', 'PUBLISHED', 'ARCHIVED']);

export const createCourseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  priceMmk: z.coerce.number().int().min(0).max(100000000),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(220)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
});

export const updateCourseSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  priceMmk: z.coerce.number().int().min(0).max(100000000).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(220)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  coverMediaId: z.string().uuid().optional().nullable(),
});

export const courseStatusFilterSchema = z
  .object({ status: courseStatusEnum.optional() })
  .optional();

export const createSectionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  position: z.coerce.number().int().min(0).optional(),
});

export const updateSectionSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  position: z.coerce.number().int().min(0).optional(),
});

export const createLessonSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  position: z.coerce.number().int().min(0).optional(),
  videoProvider: z.string().trim().max(60).optional().nullable(),
  videoRef: z.string().trim().max(500).optional().nullable(),
  durationSeconds: z.coerce.number().int().min(0).max(86400).optional().nullable(),
  isPreview: z.boolean().optional(),
});

export const updateLessonSchema = createLessonSchema.partial();

export const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1).max(200),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
