-- CreateIndex
CREATE INDEX "Tasks_deleted_at_idx" ON "Tasks"("deleted_at");

-- CreateIndex
CREATE INDEX "Tasks_due_date_idx" ON "Tasks"("due_date");
