-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "renewalDate" TIMESTAMP(3),
ADD COLUMN     "renewed" BOOLEAN NOT NULL DEFAULT false;
