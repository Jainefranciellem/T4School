-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "alerta_inatividade_enviado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "alerta_poucas_aulas_enviado" BOOLEAN NOT NULL DEFAULT false;

