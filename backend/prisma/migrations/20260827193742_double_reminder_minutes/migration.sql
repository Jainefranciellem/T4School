/*
  Warnings:

  - You are about to drop the column `double_reminder_hours` on the `Settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "double_reminder_hours",
ADD COLUMN     "double_reminder_minutes" INTEGER NOT NULL DEFAULT 15;
