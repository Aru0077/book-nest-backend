/*
  Warnings:

  - The `status` column on the `admin_users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."AdminStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."admin_users" ADD COLUMN     "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "rejectedReason" TEXT,
ADD COLUMN     "role" "public"."AdminRole" NOT NULL DEFAULT 'ADMIN',
DROP COLUMN "status",
ADD COLUMN     "status" "public"."AdminStatus" NOT NULL DEFAULT 'PENDING';
