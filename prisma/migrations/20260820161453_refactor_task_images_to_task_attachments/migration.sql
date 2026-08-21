/*
  Warnings:

  - You are about to drop the `TaskImages` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TaskImages" DROP CONSTRAINT "TaskImages_task_id_fkey";

-- DropTable
DROP TABLE "TaskImages";

-- CreateTable
CREATE TABLE "TaskAttachments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "bucket_key" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskAttachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskAttachments_task_id_idx" ON "TaskAttachments"("task_id");

-- CreateIndex
CREATE INDEX "TaskAttachments_user_id_idx" ON "TaskAttachments"("user_id");

-- AddForeignKey
ALTER TABLE "TaskAttachments" ADD CONSTRAINT "TaskAttachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAttachments" ADD CONSTRAINT "TaskAttachments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
