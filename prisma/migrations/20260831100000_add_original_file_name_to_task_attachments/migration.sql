-- Add original_file_name column (temporarily nullable to allow backfill)
ALTER TABLE "TaskAttachments" ADD COLUMN "original_file_name" TEXT;

-- Backfill existing rows with the current display file_name
UPDATE "TaskAttachments" SET "original_file_name" = "file_name" WHERE "original_file_name" IS NULL;

-- Enforce NOT NULL after backfill
ALTER TABLE "TaskAttachments" ALTER COLUMN "original_file_name" SET NOT NULL;

-- Enforce unique display filename within the same task as the final protection
CREATE UNIQUE INDEX "TaskAttachments_task_id_file_name_key" ON "TaskAttachments"("task_id", "file_name");
