import { z } from 'zod';

export const createBlockedDateSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato yyyy-MM-dd'),
  motivo: z.string().max(200).optional(),
});
