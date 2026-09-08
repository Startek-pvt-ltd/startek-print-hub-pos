"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { settingsSchema } from "@/lib/validations/settings";

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
