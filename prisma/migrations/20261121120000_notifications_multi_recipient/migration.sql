-- DropIndex
DROP INDEX "Notifications_eventId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Notifications_eventId_recipientId_key" ON "Notifications"("eventId", "recipientId");
