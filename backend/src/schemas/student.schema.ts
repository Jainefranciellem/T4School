import { z } from 'zod';

export const studentStatusSchema = z.enum(['Ativo', 'Inativo']);

export const createStudentSchema = z.object({
  nome: z.string().min(1),
  telefone: z.string().min(1),
  email: z.string().email(),
  plano: z.string().min(1),
  aulas_restantes: z.number().int().min(0).default(0),
  status: studentStatusSchema.default('Ativo'),
  avatar: z.string().optional(),
});

export const updateStudentSchema = createStudentSchema.partial();
