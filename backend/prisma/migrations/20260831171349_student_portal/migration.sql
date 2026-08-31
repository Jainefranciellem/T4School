-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "access_token" TEXT NOT NULL DEFAULT gen_random_uuid()::text;

-- CreateTable
CREATE TABLE "StudentDeviceToken" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentDeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentDeviceToken_token_key" ON "StudentDeviceToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Student_access_token_key" ON "Student"("access_token");

-- AddForeignKey
ALTER TABLE "StudentDeviceToken" ADD CONSTRAINT "StudentDeviceToken_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
