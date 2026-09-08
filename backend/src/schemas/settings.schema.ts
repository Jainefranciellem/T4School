import { z } from 'zod';

const weekdayTimesSchema = z.record(
  z.string().regex(/^[0-6]$/),
  z.array(z.string().regex(/^\d{2}:\d{2}$/, 'Use o formato HH:mm'))
);

const weeklyScheduleSchema = z
  .object({
    Surf: weekdayTimesSchema.optional(),
    SurfSkate: weekdayTimesSchema.optional(),
  })
  .nullable();

export const updateSettingsSchema = z.object({
  // Nullable porque o form do painel sempre reenvia o objeto inteiro de
  // Settings de volta — inclusive esses campos quando ainda não foram
  // configurados (o GET /settings retorna null pra eles nesse caso).
  whatsapp_phone_id: z.string().nullable().optional(),
  whatsapp_token: z.string().nullable().optional(),
  resend_api_key: z.string().nullable().optional(),
  email_from: z.string().min(1).nullable().optional(),
  send_reminders: z.boolean().optional(),
  reminder_hours: z.number().int().min(1).max(72).optional(),
  double_reminder: z.boolean().optional(),
  double_reminder_minutes: z.number().int().min(1).max(180).optional(),
  template_reminder: z.string().min(1).optional(),
  template_confirmed: z.string().min(1).optional(),
  template_cancelled: z.string().min(1).optional(),
  template_rescheduled: z.string().min(1).optional(),
  instructor_name: z.string().min(1).optional(),
  locations: z.array(z.string().min(1)).min(1).optional(),
  weekly_schedule: weeklyScheduleSchema.optional(),
});
