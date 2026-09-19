"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requirePermission, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { settingsSchema } from "@/lib/validations/settings";
import { startFreshSchema } from "@/lib/validations/maintenance";
import { OperationalPeriodError } from "@/lib/operational-period";
import { startFreshOperationalPeriod } from "@/server/maintenance-service";

export type SettingsState = { error?: string; success?: string };

export async function saveSettings(input: unknown): Promise<SettingsState> {
  const user = await requirePermission("settings:manage");
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the settings values" };

  const before = await db.setting.findUnique({ where: { id: "primary" } });
  await db.$transaction([
    db.setting.upsert({ where: { id: "primary" }, update: parsed.data, create: { id: "primary", ...parsed.data } }),
    db.auditLog.create({ data: { userId: user.id, action: "SETTINGS_UPDATED", entityType: "Setting", entityId: "primary", metadata: { before, after: parsed.data }, ipAddress: (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() } }),
  ]);
  revalidatePath("/settings");
  return { success: "Business settings saved" };
}

export async function startFresh(input: unknown): Promise<SettingsState> {
  const user = await requireRole("ADMIN");
  const parsed = startFreshSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confirm the clean start" };

  try {
    const headerStore = await headers();
    await startFreshOperationalPeriod(user, {
      backupConfirmed: parsed.data.backupConfirmed,
      ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim(),
    });
    revalidatePath("/", "layout");
    return { success: "A new operational period has started. Previous records remain retained as archived data." };
  } catch (error) {
    return {
      error: error instanceof OperationalPeriodError
        ? error.message
        : "The operational period could not be started. Please try again.",
    };
  }
}
