import { z } from 'zod';

export const updateSettingsSchema = z.object({
  whatsapp_phone_id: z.string().optional(),
  whatsapp_token: z.string().optional(),
  resend_api_key: z.string().optional(),
  email_from: z.string().min(1).optional(),
  send_reminders: z.boolean().optional(),
  reminder_hours: z.number().int().min(1).max(72).optional(),
  double_reminder: z.boolean().optional(),
  double_reminder_minutes: z.number().int().min(1).max(180).optional(),
  template_reminder: z.string().min(1).optional(),
  template_confirmed: z.string().min(1).optional(),
  template_cancelled: z.string().min(1).optional(),
});
