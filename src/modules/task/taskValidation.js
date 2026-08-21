import { z } from "zod";

export const postTaskSchema = z.object({
    body: z.object({
        title: z.string().min(4, "Task title must be at least 4 chars")
            .refine(val => val.trim().length > 0, { message: "Title cannot be only whitespace" }),
        projectId: z.string(),
        description: z.string().optional(),
        status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "Low", "Medium", "High"]).transform(val => val.toUpperCase()).default("MEDIUM"),
        startDate: z.string().datetime({ message: "startDate must be a valid UTC datetime string" }),
        dueDate: z.string().datetime({ message: "dueDate must be a valid UTC datetime string" }).optional()
    }).strict(),
});

export const postTaskImageSchema = z.object({
    body: z.object({
        imageTitle: z.string().min(1, "Title must be at least 1 char").optional(),
        fileName: z.string().min(1, "File name must be at least 1 char").optional(),
    }),
});

export const postTaskAttachmentSchema = z.object({
    body: z.object({
        fileName: z.string().min(1, "File name must be at least 1 char").optional(),
    }),
});

export const getTaskAttachmentsQuerySchema = z.object({
    query: z.object({
        type: z.enum(["all", "image", "file"]).optional().default("all"),
    }),
});

export const assignTaskSchema = z.object({
    body: z.object({
        memberId: z.string().nullable(),
    }).strict(),
});

export const updateTaskSchema = z.object({
    body: z.object({
        title: z.string().min(4, "Task title must be at least 4 chars")
            .refine(val => val.trim().length > 0, { message: "Title cannot be only whitespace" }).optional(),
        description: z.string().optional(),
        status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "Low", "Medium", "High"]).transform(val => val.toUpperCase()).optional(),
        startDate: z.string().datetime({ message: "startDate must be a valid UTC datetime string" }).optional(),
        dueDate: z.string().datetime({ message: "dueDate must be a valid UTC datetime string" }).nullable().optional()
    }).strict(),
});

export const updateTaskStatusSchema = z.object({
    body: z.object({
        completed: z.boolean(),
    }).strict(),
});

export const updateTaskProgressSchema = z.object({
    body: z.object({
        status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
        description: z.string().optional()
    }).strict(),
});