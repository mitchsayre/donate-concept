import { z } from "zod";

export const SignupSchema = z.object({
  email: z.string().min(1, { message: "Email is required" }).email("Please enter a valid email"),
  password: z.string().min(1, { message: "Password is required" }),
  passwordConfirm: z.string().min(1, { message: "Password is required" }),
});

export type SignupRequest = z.infer<typeof SignupSchema>;
