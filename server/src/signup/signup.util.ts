import { Session } from "fastify";
import { z } from "zod";
import { create } from "../../lib/database";
import { User } from "@prisma/client";
import { randomUUID } from "crypto";

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

export type SignupToken = {
  sub: string; // User's id
  exp: number; // Expiration unix timestamp
  mode: "Signup";
};

const SIGNUP_REFRESH_TOKEN_VALIDITY_PERIOD = parseInt(
  process.env.SIGNUP_REFRESH_TOKEN_VALIDITY_PERIOD!
);

export const createSignupTokenPair = (user: User): SignupToken => {
  const exp = Date.now() + SIGNUP_REFRESH_TOKEN_VALIDITY_PERIOD;

  return { sub: user.id, mode: "Signup", exp };
};
