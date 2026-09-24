import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { revokeSessionToken, sessionExpiresAt, validateSessionRecord } from "@/lib/auth-service";
import type { Role } from "@/generated/prisma/client";
import { hasPermission, type Permission } from "@/lib/permissions";

const SESSION_COOKIE = "stph_session";
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, keepSignedIn = false) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = sessionExpiresAt(keepSignedIn);
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  await revokeSessionToken(token, (value) => db.session.deleteMany({ where: { tokenHash: hashToken(value) } }));
  cookieStore.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  return validateSessionRecord(session);
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: readonly Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/unauthorized");
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) redirect("/unauthorized");
  return user;
}
