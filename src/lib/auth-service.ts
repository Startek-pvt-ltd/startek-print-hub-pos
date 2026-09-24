import type { Role, UserStatus } from "@/generated/prisma/client";

export type StaffIdentity = {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
};

export type StaffSessionRecord = {
  expiresAt: Date;
  user: StaffIdentity;
};

type AuthenticateDependencies = {
  findUser: (username: string) => Promise<StaffIdentity | null>;
  verifyPassword: (password: string, passwordHash: string) => Promise<boolean>;
  writeAudit: (event: {
    userId: string | null;
    action: "LOGIN_SUCCEEDED" | "LOGIN_FAILED";
    metadata: { username: string };
    ipAddress?: string;
  }) => Promise<unknown>;
  dummyPasswordHash: string;
};

export async function authenticateStaff(
  input: { username: string; password: string; ipAddress?: string },
  dependencies: AuthenticateDependencies,
) {
  const user = await dependencies.findUser(input.username);
  const passwordMatches = await dependencies.verifyPassword(
    input.password,
    user?.passwordHash ?? dependencies.dummyPasswordHash,
  );
  const authenticated = Boolean(user && user.status === "ACTIVE" && passwordMatches);

  await dependencies.writeAudit({
    userId: authenticated && user ? user.id : null,
    action: authenticated ? "LOGIN_SUCCEEDED" : "LOGIN_FAILED",
    metadata: { username: input.username },
    ipAddress: input.ipAddress,
  });

  return authenticated ? user : null;
}

export const NORMAL_SESSION_AGE_MS = 1000 * 60 * 60 * 12;
export const PERSISTENT_SESSION_AGE_MS = 1000 * 60 * 60 * 24 * 30;

export function sessionExpiresAt(keepSignedIn: boolean, now = new Date()) {
  return new Date(now.getTime() + (keepSignedIn ? PERSISTENT_SESSION_AGE_MS : NORMAL_SESSION_AGE_MS));
}

export async function revokeSessionToken(token: string | undefined, revoke: (token: string) => Promise<unknown>) {
  if (token) await revoke(token);
}

export function validateSessionRecord(session: StaffSessionRecord | null, now = new Date()) {
  if (!session || session.expiresAt <= now || session.user.status !== "ACTIVE") return null;
  return session.user;
}
