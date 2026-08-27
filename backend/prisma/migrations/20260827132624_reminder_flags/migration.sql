-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "lembrete_dobrado_enviado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lembrete_enviado" BOOLEAN NOT NULL DEFAULT false;
