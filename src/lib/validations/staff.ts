import { z } from "zod";

export const staffRoles = ["ADMIN", "STAFF"] as const;
export const staffStatuses = ["ACTIVE", "DISABLED"] as const;

export const usernameSchema = z.string().trim().min(3, "Use at least 3 characters").max(32, "Use no more than 32 characters").regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, "Use letters, numbers, dots, underscores, or hyphens").transform((value) => value.toLowerCase());
const password = z.string().min(12, "Use at least 12 characters").max(128);

export const createStaffSchema = z.object({
  name: z.string().trim().min(2, "Enter the staff name").max(100),
  username: usernameSchema,
  role: z.enum(staffRoles),
  status: z.enum(staffStatuses),
  password,
  confirmPassword: z.string(),
}).superRefine((value, context) => {
  if (value.password !== value.confirmPassword) {
    context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match" });
  }
});

export const updateStaffSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Enter the staff name").max(100),
  username: usernameSchema,
  role: z.enum(staffRoles),
  status: z.enum(staffStatuses),
});

export const resetStaffPasswordSchema = z.object({
  id: z.string().min(1),
  password,
  confirmPassword: z.string(),
}).superRefine((value, context) => {
  if (value.password !== value.confirmPassword) {
    context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match" });
  }
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type ResetStaffPasswordInput = z.infer<typeof resetStaffPasswordSchema>;
