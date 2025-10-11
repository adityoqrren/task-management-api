/*
  Warnings:

  - Added the required column `bucket_key` to the `TaskImages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `object_key` to the `TaskImages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TaskImages" ADD COLUMN     "bucket_key" TEXT NOT NULL,
ADD COLUMN     "object_key" TEXT NOT NULL;
