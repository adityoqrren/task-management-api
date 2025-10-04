import { z } from "zod";

export const postProjectSchema = z.object({
    body: z.object({
        name: z.string().min(4, "Project name must be at least 4 chars"),
    }),
});

export const postMemberSchema = z.object({
    body: z.object({
        projectId: z.string().nonempty(),
        userId: z.string().nonempty(),
    }).strict(),
});

export const updateMemberActiveStatusSchema = z.object({
    body: z.object({
        isActive: z.boolean(),
    }).strict(),
})