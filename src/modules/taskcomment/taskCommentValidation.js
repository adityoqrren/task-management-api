import { z } from "zod";

const contentSchema = z
  .string()
  .trim()
  .min(1, "Comment cannot be empty")
  .max(2000, "Comment must not exceed 2000 characters");

export const createTaskCommentSchema = z.object({
  body:
    z.object({
      content: contentSchema,
    })
});

export const updateTaskCommentSchema = z.object({
  body:
    z.object({
      content: contentSchema,
    })
});