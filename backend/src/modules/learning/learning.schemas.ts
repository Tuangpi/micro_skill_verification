import { z } from 'zod';

export const updateProgressSchema = z.object({
  positionSeconds: z.coerce.number().int().min(0).max(86400).optional(),
  completed: z.boolean().optional(),
});

export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
