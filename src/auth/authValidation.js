import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    email: z.email("Invalid email format"),
    name: z.string().min(3),
    username: z.string().min(3, "Username must be at least 3 chars"),
    password: z.string().min(6, "Password must be at least 6 chars"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().min(3, "Email/Username required"),
    password: z.string().min(4, "Password must be at least 4 chars"),
  }),
});

export const updateTokenSchema = z.object({
  body: z.object({
    refreshToken: z.jwt(),
  }),
});