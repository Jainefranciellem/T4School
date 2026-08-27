-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('Surf', 'SurfSkate');

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "tipo" "LessonType" NOT NULL DEFAULT 'Surf';

-- CreateIndex
CREATE UNIQUE INDEX "Plan_nome_key" ON "Plan"("nome");

