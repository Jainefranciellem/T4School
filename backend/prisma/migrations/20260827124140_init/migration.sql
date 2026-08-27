-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'INSTRUTOR');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('Ativo', 'Inativo');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('Agendada', 'Confirmada', 'Compareceu', 'Faltou', 'Cancelada');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "qtd_aulas" INTEGER NOT NULL,
    "validade_dias" INTEGER NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "plano" TEXT NOT NULL,
    "aulas_restantes" INTEGER NOT NULL DEFAULT 0,
    "status" "StudentStatus" NOT NULL DEFAULT 'Ativo',
    "avatar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "instrutor" TEXT NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'Agendada',
    "observacoes" TEXT,
    "notificacao_enviada" BOOLEAN NOT NULL DEFAULT false,
    "enviar_notificacao" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "whatsapp_phone_id" TEXT,
    "whatsapp_token" TEXT,
    "send_reminders" BOOLEAN NOT NULL DEFAULT true,
    "reminder_hours" INTEGER NOT NULL DEFAULT 24,
    "double_reminder" BOOLEAN NOT NULL DEFAULT true,
    "double_reminder_hours" INTEGER NOT NULL DEFAULT 1,
    "template_reminder" TEXT NOT NULL DEFAULT 'Olá {{nome}}! Lembrete: sua aula de surf é hoje às {{hora}} no {{local}} com {{instrutor}}.',
    "template_confirmed" TEXT NOT NULL DEFAULT 'Presença confirmada! Te esperamos na aula de hoje.',
    "template_cancelled" TEXT NOT NULL DEFAULT 'Tudo bem — registramos sua ausência. Entre em contato para remarcar.',

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Lesson_data_idx" ON "Lesson"("data");

-- CreateIndex
CREATE INDEX "Lesson_aluno_id_idx" ON "Lesson"("aluno_id");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
