import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3333),
  CORS_ORIGIN: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  INTERNAL_JOB_SECRET: z.string().min(1),
  REMINDER_JOB_CRON: z.string().default('*/15 * * * *'),
  CRON_SECRET: z.string().optional(),
});

export const env = envSchema.parse(process.env);
