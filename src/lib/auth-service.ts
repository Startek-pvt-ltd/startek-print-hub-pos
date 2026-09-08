import type { Role, UserStatus } from "@/generated/prisma/client";

export type StaffIdentity = {
  id: string;
  name: string;
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
  findUser: (email: string) => Promise<StaffIdentity | null>;
  verifyPassword: (password: string, passwordHash: string) => Promise<boolean>;
  writeAudit: (event: {
    userId: string | null;
    action: "LOGIN_SUCCEEDED" | "LOGIN_FAILED";
    metadata: { email: string };
    ipAddress?: string;
  }) => Promise<unknown>;
  dummyPasswordHash: string;
};

export async function authenticateStaff(
  input: { email: string; password: string; ipAddress?: string },
  dependencies: AuthenticateDependencies,
) {
  const user = await dependencies.findUser(input.email);
  const passwordMatches = await dependencies.verifyPassword(
    input.password,
    user?.passwordHash ?? dependencies.dummyPasswordHash,
  );
  const authenticated = Boolean(user && user.status === "ACTIVE" && passwordMatches);

  await dependencies.writeAudit({
    userId: authenticated && user ? user.id : null,
    action: authenticated ? "LOGIN_SUCCEEDED" : "LOGIN_FAILED",
    metadata: { email: input.email },
    ipAddress: input.ipAddress,
  });

  return authenticated ? user : null;
}

export function validateSessionRecord(session: StaffSessionRecord | null, now = new Date()) {
  if (!session || session.expiresAt <= now || session.user.status !== "ACTIVE") return null;
  return session.user;
}
