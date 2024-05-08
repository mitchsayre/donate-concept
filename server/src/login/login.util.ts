import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().min(1, { message: "Email is required" }).email("Please enter a valid email"),
  password: z.string().min(1, { message: "Password is required" }),
});

export type LoginRequest = z.infer<typeof LoginSchema>;
