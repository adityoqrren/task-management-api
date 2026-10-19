import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(3, "Name must be at least 3 chars").max(120, "Name must be at most 120 chars"),
  }).strict(),
});
