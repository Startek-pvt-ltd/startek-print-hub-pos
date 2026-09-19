import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

type SettingReader = Pick<Prisma.TransactionClient, "setting">;

export async function getOperationalDataStartAt(client: SettingReader = db) {
  const setting = await client.setting.findUnique({
    where: { id: "primary" },
    select: { operationalDataStartAt: true },
  });
  return setting?.operationalDataStartAt ?? null;
}

export function isArchivedOperationalRecord(createdAt: Date, cutoff: Date | null) {
  return Boolean(cutoff && createdAt < cutoff);
}

export function effectiveOperationalStart(requestedStart: Date, cutoff: Date | null) {
  return cutoff && cutoff > requestedStart ? cutoff : requestedStart;
}

export async function assertCurrentOperationalRecord(client: SettingReader, createdAt: Date) {
  const cutoff = await getOperationalDataStartAt(client);
  if (isArchivedOperationalRecord(createdAt, cutoff)) {
    throw new OperationalPeriodError("ARCHIVED_RECORD", "Archived pre-go-live records are read-only");
  }
}

export class OperationalPeriodError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "OperationalPeriodError";
  }
}
