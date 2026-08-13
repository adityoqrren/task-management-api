-- DropIndex
DROP INDEX "ActivityLogs_projectId_createdAt_idx";

-- DropIndex
DROP INDEX "ActivityLogs_type_idx";

-- AlterTable
ALTER TABLE "ActivityLogs" ADD COLUMN     "entityTitle" TEXT,
ADD COLUMN     "projectName" TEXT,
ALTER COLUMN "message" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ActivityLogs_projectId_idx" ON "ActivityLogs"("projectId");

-- AddForeignKey
ALTER TABLE "ActivityLogs" ADD CONSTRAINT "ActivityLogs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLogs" ADD CONSTRAINT "ActivityLogs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
