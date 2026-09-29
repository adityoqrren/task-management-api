-- CreateTable
CREATE TABLE "TaskComments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskComments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskComments_task_id_created_at_idx" ON "TaskComments"("task_id", "created_at");

-- CreateIndex
CREATE INDEX "TaskComments_user_id_idx" ON "TaskComments"("user_id");

-- AddForeignKey
ALTER TABLE "TaskComments" ADD CONSTRAINT "TaskComments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComments" ADD CONSTRAINT "TaskComments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
