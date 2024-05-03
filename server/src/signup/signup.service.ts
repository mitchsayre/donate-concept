import { z } from "zod";

export const SignupSchema = z
  .object({
    email: z
      .string()
      .min(1, { message: "Email is required." })
      .email({ message: "Please enter a valid email address." }),
    password: z.string().min(12, { message: "Password must contain at least 12 characters." }),
    passwordConfirm: z.string().min(1, { message: "Password confirmation is required." }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords do not match.",
    path: ["passwordConfirm"],
  });

export type SignupRequest = z.infer<typeof SignupSchema>;
