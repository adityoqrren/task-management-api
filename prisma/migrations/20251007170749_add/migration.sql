-- CreateTable
CREATE TABLE "TaskImages" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "image_title" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,

    CONSTRAINT "TaskImages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TaskImages" ADD CONSTRAINT "TaskImages_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
