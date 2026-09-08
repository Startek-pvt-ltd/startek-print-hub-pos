import type { Role } from "@/generated/prisma/client";
import { hasPermission, type Permission } from "@/lib/permissions";

export type AuthenticatedPrincipal = {
  id: string;
  role: Role;
};

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required");
    this.name = "AuthenticationRequiredError";
  }
}

export class AuthorizationDeniedError extends Error {
  constructor() {
    super("You do not have permission to perform this action");
    this.name = "AuthorizationDeniedError";
  }
}

export function assertAuthenticated<T extends AuthenticatedPrincipal>(user: T | null): T {
  if (!user) throw new AuthenticationRequiredError();
  return user;
}

export function assertRole<T extends AuthenticatedPrincipal>(user: T, roles: readonly Role[]): T {
  if (!roles.includes(user.role)) throw new AuthorizationDeniedError();
  return user;
}

export function assertPermission<T extends AuthenticatedPrincipal>(user: T, permission: Permission): T {
  if (!hasPermission(user.role, permission)) throw new AuthorizationDeniedError();
  return user;
}
