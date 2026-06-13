/*
  Warnings:

  - Added the required column `activatesAt` to the `UserMission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserMission" ADD COLUMN     "activatesAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'pending';
