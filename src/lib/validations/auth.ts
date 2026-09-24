import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(3, "Enter your username").max(32).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, "Enter a valid username").transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Enter your password").max(128),
  keepSignedIn: z.boolean().default(false),
});

export type LoginInput = z.input<typeof loginSchema>;
