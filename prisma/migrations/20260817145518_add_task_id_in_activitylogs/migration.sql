-- AlterTable
ALTER TABLE "ActivityLogs" ADD COLUMN     "taskId" TEXT;

-- CreateIndex
CREATE INDEX "ActivityLogs_taskId_idx" ON "ActivityLogs"("taskId");
