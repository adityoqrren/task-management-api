-- CreateTable
CREATE TABLE "Notifications" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "projectId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notifications_eventId_key" ON "Notifications"("eventId");

-- CreateIndex
CREATE INDEX "Notifications_recipientId_createdAt_idx" ON "Notifications"("recipientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notifications_recipientId_isRead_idx" ON "Notifications"("recipientId", "isRead");
