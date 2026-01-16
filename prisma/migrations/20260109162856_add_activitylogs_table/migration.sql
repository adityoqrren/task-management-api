-- CreateTable
CREATE TABLE "ActivityLogs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityLogs_eventId_key" ON "ActivityLogs"("eventId");

-- CreateIndex
CREATE INDEX "ActivityLogs_projectId_createdAt_idx" ON "ActivityLogs"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLogs_actorId_idx" ON "ActivityLogs"("actorId");

-- CreateIndex
CREATE INDEX "ActivityLogs_targetUserId_idx" ON "ActivityLogs"("targetUserId");

-- CreateIndex
CREATE INDEX "ActivityLogs_type_idx" ON "ActivityLogs"("type");
