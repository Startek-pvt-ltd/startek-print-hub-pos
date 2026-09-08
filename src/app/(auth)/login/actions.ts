"use server";

import { compare } from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { authenticateStaff } from "@/lib/auth-service";
import { loginSchema } from "@/lib/validations/auth";

export type LoginState = { error?: string };

// A valid bcrypt hash keeps unknown-email attempts on the same expensive path as known users.
const DUMMY_PASSWORD_HASH = "$2b$12$KIXQ4BZXzS3TO4hY1JzM9eBlbKT6GpxB4Y7q7o12jQ0YcMz8YDqZK";

export async function login(input: unknown): Promise<LoginState> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your login details" };

  const headerStore = await headers();
  const ipAddress = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const user = await authenticateStaff({ ...parsed.data, ipAddress }, {
    findUser: (email) => db.user.findUnique({ where: { email } }),
    verifyPassword: compare,
    writeAudit: (event) => db.auditLog.create({ data: event }),
    dummyPasswordHash: DUMMY_PASSWORD_HASH,
  });

  if (!user) return { error: "Email or password is incorrect" };
  await createSession(user.id);
  redirect("/dashboard");
}
