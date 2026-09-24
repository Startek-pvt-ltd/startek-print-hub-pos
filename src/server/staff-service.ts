import "server-only";

import { hash } from "bcryptjs";
import { Prisma, type Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { CreateStaffInput, ResetStaffPasswordInput, UpdateStaffInput } from "@/lib/validations/staff";

type Actor = { id: string; role: Role };

export class StaffOperationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "StaffOperationError";
  }
}

function assertAdministrator(actor: Actor) {
  if (actor.role !== "ADMIN") throw new StaffOperationError("UNAUTHORIZED", "Only an administrator can manage staff accounts");
}

function compatibilityEmail(username: string) {
  return `${username}@staff.startek.local`;
}

export function assertSafeStaffUpdate(input: {
  actorId: string;
  targetId: string;
  currentRole: Role;
  currentStatus: "ACTIVE" | "DISABLED";
  nextRole: Role;
  nextStatus: "ACTIVE" | "DISABLED";
  activeAdminCount: number;
}) {
  if (input.actorId === input.targetId && input.nextStatus === "DISABLED") {
    throw new StaffOperationError("SELF_DISABLE", "You cannot disable your own signed-in account");
  }
  const removesActiveAdmin = input.currentRole === "ADMIN"
    && input.currentStatus === "ACTIVE"
    && (input.nextRole !== "ADMIN" || input.nextStatus !== "ACTIVE");
  if (removesActiveAdmin && input.activeAdminCount <= 1) {
    throw new StaffOperationError("LAST_ADMIN", "At least one active administrator must remain");
  }
}

export async function createStaffAccount(input: CreateStaffInput, actor: Actor) {
  assertAdministrator(actor);
  const username = input.username.trim().toLowerCase();
  const passwordHash = await hash(input.password, 12);
  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { username }, select: { id: true } });
      if (existing) throw new StaffOperationError("DUPLICATE_USERNAME", "A staff account already uses this username");
      const staff = await tx.user.create({
        data: { name: input.name, username, email: compatibilityEmail(username), role: input.role, status: input.status, passwordHash },
        select: { id: true, name: true, username: true, role: true, status: true, createdAt: true, updatedAt: true },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "STAFF_CREATED",
          entityType: "User",
          entityId: staff.id,
          metadata: { name: staff.name, username: staff.username, role: staff.role, status: staff.status },
        },
      });
      return staff;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new StaffOperationError("DUPLICATE_USERNAME", "A staff account already uses this username");
    }
    throw error;
  }
}

export async function updateStaffAccount(input: UpdateStaffInput, actor: Actor) {
  assertAdministrator(actor);
  const username = input.username.trim().toLowerCase();
  try {
    return await db.$transaction(async (tx) => {
    const current = await tx.user.findUnique({ where: { id: input.id } });
    if (!current) throw new StaffOperationError("NOT_FOUND", "Staff account was not found");
    const activeAdminCount = await tx.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
    assertSafeStaffUpdate({
      actorId: actor.id, targetId: current.id, currentRole: current.role, currentStatus: current.status,
      nextRole: input.role, nextStatus: input.status, activeAdminCount,
    });
    const updated = await tx.user.update({
      where: { id: current.id }, data: { name: input.name, username, role: input.role, status: input.status },
      select: { id: true, name: true, username: true, role: true, status: true, createdAt: true, updatedAt: true },
    });
    if ((current.status !== "DISABLED" && updated.status === "DISABLED") || current.role !== updated.role) await tx.session.deleteMany({ where: { userId: current.id } });
    const events: Prisma.AuditLogCreateManyInput[] = [{ userId: actor.id, action: "STAFF_UPDATED", entityType: "User", entityId: current.id, metadata: { previousName: current.name, newName: updated.name, previousUsername: current.username, newUsername: updated.username } }];
    if (current.role !== updated.role) events.push({ userId: actor.id, action: "STAFF_ROLE_CHANGED", entityType: "User", entityId: current.id, metadata: { previousRole: current.role, newRole: updated.role } });
    if (current.status !== updated.status) events.push({ userId: actor.id, action: updated.status === "DISABLED" ? "STAFF_DISABLED" : "STAFF_ENABLED", entityType: "User", entityId: current.id, metadata: { previousStatus: current.status, newStatus: updated.status } });
    await tx.auditLog.createMany({ data: events });
    return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new StaffOperationError("DUPLICATE_USERNAME", "A staff account already uses this username");
    }
    throw error;
  }
}

export async function resetStaffPassword(input: ResetStaffPasswordInput, actor: Actor) {
  assertAdministrator(actor);
  const passwordHash = await hash(input.password, 12);
  return db.$transaction(async (tx) => {
    const staff = await tx.user.findUnique({ where: { id: input.id }, select: { id: true, username: true, role: true } });
    if (!staff) throw new StaffOperationError("NOT_FOUND", "Staff account was not found");
    await tx.user.update({ where: { id: staff.id }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: staff.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: staff.role === "ADMIN" ? "ADMIN_PASSWORD_RESET" : "STAFF_PASSWORD_RESET", entityType: "User", entityId: staff.id, metadata: { username: staff.username, sessionsRevoked: true } } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
