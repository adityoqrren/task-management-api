-- CreateEnum
CREATE TYPE "TaskArchiveSource" AS ENUM ('MANUAL', 'PROJECT');

-- CreateEnum
CREATE TYPE "TaskDeleteSource" AS ENUM ('MANUAL', 'PROJECT');

-- AlterTable
ALTER TABLE "Projects" ADD COLUMN     "archived_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Tasks" ADD COLUMN     "archive_source" "TaskArchiveSource",
ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "delete_source" "TaskDeleteSource";

-- CreateIndex
CREATE INDEX "Projects_archived_at_idx" ON "Projects"("archived_at");

-- CreateIndex
CREATE INDEX "Projects_deleted_at_idx" ON "Projects"("deleted_at");

-- CreateIndex
CREATE INDEX "Tasks_archived_at_idx" ON "Tasks"("archived_at");
