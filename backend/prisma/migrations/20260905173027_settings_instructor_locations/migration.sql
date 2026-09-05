-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "instructor_name" TEXT NOT NULL DEFAULT 'Torquato',
ADD COLUMN     "locations" TEXT[] DEFAULT ARRAY['Cinelandia', 'Bomba', 'Cara de Sapo', 'Sementeira']::TEXT[];

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "access_token" SET DEFAULT gen_random_uuid()::text;

