import { z } from "zod";

export const postTaskSchema = z.object({
    body: z.object({
        title: z.string().min(4, "Task title must be at least 4 chars")
            .refine(val => val.trim().length > 0, { message: "Title cannot be only whitespace" }),
        projectId: z.string(),
        description: z.string().optional()
    }).strict(),
});

export const assignTaskSchema = z.object({
    body: z.object({
        memberId: z.string().nullable(),
    }).strict(),
});

export const updateTaskSchema = z.object({
    body: z.object({
        title: z.string().min(4, "Task title must be at least 4 chars").optional()
            .refine(val => val.trim().length > 0, { message: "Title cannot be only whitespace" }),
        description: z.string().optional()
    }).strict(),
});

export const updateTaskStatusSchema = z.object({
    body: z.object({
        completed: z.boolean(),
    }).strict(),
});