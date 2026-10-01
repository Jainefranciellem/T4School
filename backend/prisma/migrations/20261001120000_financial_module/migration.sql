-- CreateEnum
CREATE TYPE "FinancialType" AS ENUM ('Receita', 'Despesa');

-- CreateEnum
CREATE TYPE "FinancialStatus" AS ENUM ('Pendente', 'Pago', 'Cancelado');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "inativado_em" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "tipo" "FinancialType" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "data" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "status" "FinancialStatus" NOT NULL DEFAULT 'Pendente',
    "data_pagamento" TEXT,
    "aluno_id" TEXT,
    "aluno_nome" TEXT,
    "plano_id" TEXT,
    "plano_nome" TEXT,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialTransaction_competencia_tipo_idx" ON "FinancialTransaction"("competencia", "tipo");

-- CreateIndex
CREATE INDEX "FinancialTransaction_data_idx" ON "FinancialTransaction"("data");

-- CreateIndex
CREATE INDEX "FinancialTransaction_aluno_id_idx" ON "FinancialTransaction"("aluno_id");

-- CreateIndex
CREATE INDEX "FinancialTransaction_plano_id_idx" ON "FinancialTransaction"("plano_id");

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Constraints: valor sempre positivo (o tipo Receita/Despesa dá o sinal) e
-- formatos de data/competência consistentes com o resto do schema (strings).
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_valor_positive" CHECK ("valor" > 0);
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_data_format" CHECK ("data" ~ '^\d{4}-\d{2}-\d{2}$');
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_competencia_format" CHECK ("competencia" ~ '^\d{4}-\d{2}$');

-- Backfill: alunos já inativos não têm data real de inativação; a melhor
-- aproximação disponível é o último updated_at.
UPDATE "Student" SET "inativado_em" = "updated_at" WHERE "status" = 'Inativo' AND "inativado_em" IS NULL;
