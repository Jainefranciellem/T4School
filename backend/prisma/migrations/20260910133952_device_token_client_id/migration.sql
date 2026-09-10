-- AlterTable
ALTER TABLE "DeviceToken" ADD COLUMN     "client_id" TEXT;

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "access_token" SET DEFAULT gen_random_uuid()::text;

-- CreateIndex
CREATE INDEX "DeviceToken_client_id_idx" ON "DeviceToken"("client_id");
