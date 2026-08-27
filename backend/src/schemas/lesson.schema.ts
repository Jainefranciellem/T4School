import { z } from 'zod';

export const lessonStatusSchema = z.enum([
  'Agendada',
  'Confirmada',
  'Compareceu',
  'Faltou',
  'Cancelada',
]);

export const lessonTypeSchema = z.enum(['Surf', 'SurfSkate']);

export const createLessonSchema = z.object({
  aluno_id: z.string().uuid(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato yyyy-MM-dd'),
  hora: z.string().regex(/^\d{2}:\d{2}$/, 'Use o formato HH:mm'),
  local: z.string().min(1),
  instrutor: z.string().min(1),
  tipo: lessonTypeSchema.default('Surf'),
  observacoes: z.string().optional(),
  status: lessonStatusSchema.default('Agendada'),
  notificacao_enviada: z.boolean().default(false),
  enviar_notificacao: z.boolean().default(true),
});

export const updateLessonSchema = createLessonSchema.partial();
