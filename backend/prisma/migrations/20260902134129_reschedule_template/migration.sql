-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "template_rescheduled" TEXT NOT NULL DEFAULT 'Olá {{nome}}! Sua aula foi remarcada para {{data}} às {{hora}}, em {{local}} com {{instrutor}}.';

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "access_token" SET DEFAULT gen_random_uuid()::text;

