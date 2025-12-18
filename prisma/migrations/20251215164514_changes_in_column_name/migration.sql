/*
  Warnings:

  - You are about to drop the column `asignee_id` on the `Tasks` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Tasks" DROP CONSTRAINT "Tasks_asignee_id_fkey";

-- DropIndex
DROP INDEX "Tasks_asignee_id_idx";

-- AlterTable
ALTER TABLE "Tasks" DROP COLUMN "asignee_id",
ADD COLUMN     "assignee_id" TEXT;

-- CreateIndex
CREATE INDEX "Tasks_assignee_id_idx" ON "Tasks"("assignee_id");

-- AddForeignKey
ALTER TABLE "Tasks" ADD CONSTRAINT "Tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "ProjectMembers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
