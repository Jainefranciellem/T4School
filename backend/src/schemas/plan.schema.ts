import { z } from 'zod';

export const createPlanSchema = z.object({
  nome: z.string().min(1),
  qtd_aulas: z.number().int().min(1),
  validade_dias: z.number().int().min(1),
  preco: z.number().nonnegative(),
});

export const updatePlanSchema = createPlanSchema.partial();
