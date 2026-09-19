import "server-only";

import { Prisma, type Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { OperationalPeriodError } from "@/lib/operational-period";

type Actor = { id: string; role: Role };

export async function startFreshOperationalPeriod(
  actor: Actor,
  options: { backupConfirmed: true; now?: Date; ipAddress?: string },
) {
  if (actor.role !== "ADMIN") {
    throw new OperationalPeriodError("UNAUTHORIZED", "Only an administrator can start a new operational period");
  }

  return db.$transaction(async (tx) => {
    const [current, openSession, authenticatedActor] = await Promise.all([
      tx.setting.findUnique({ where: { id: "primary" }, select: { operationalDataStartAt: true } }),
      tx.cashSession.findUnique({ where: { openGuard: "PRIMARY" }, select: { id: true } }),
      tx.user.findUnique({ where: { id: actor.id }, select: { role: true, status: true } }),
    ]);
    if (!authenticatedActor || authenticatedActor.role !== "ADMIN" || authenticatedActor.status !== "ACTIVE") {
      throw new OperationalPeriodError("UNAUTHORIZED", "Only an active administrator can start a new operational period");
    }
    if (!current) throw new OperationalPeriodError("SETTINGS_MISSING", "Business settings are not configured");
    if (openSession) {
      throw new OperationalPeriodError(
        "REGISTER_OPEN",
        "Close the active Cash Register session before starting a new operational period.",
      );
    }

    const nextCutoff = options.now ?? new Date();
    const updated = await tx.setting.update({
      where: { id: "primary" },
      data: { operationalDataStartAt: nextCutoff },
      select: { operationalDataStartAt: true },
    });
    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: "START_FRESH",
        entityType: "Setting",
        entityId: "primary",
        ipAddress: options.ipAddress,
        metadata: {
          previousOperationalDataStartAt: current.operationalDataStartAt?.toISOString() ?? null,
          newOperationalDataStartAt: nextCutoff.toISOString(),
          backupConfirmed: options.backupConfirmed,
        },
      },
    });
    return updated.operationalDataStartAt;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
