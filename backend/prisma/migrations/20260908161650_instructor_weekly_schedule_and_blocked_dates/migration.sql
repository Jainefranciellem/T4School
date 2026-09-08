-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "weekly_schedule" JSONB;

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "access_token" SET DEFAULT gen_random_uuid()::text;

-- CreateTable
CREATE TABLE "BlockedDate" (
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedDate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockedDate_data_key" ON "BlockedDate"("data");

-- CreateIndex
CREATE INDEX "BlockedDate_data_idx" ON "BlockedDate"("data");
