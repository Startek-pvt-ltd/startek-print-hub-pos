"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { resetDashboardTodaySales } from "@/server/report-service";

const resetSchema = z.object({ confirmation: z.literal("RESET_TODAY_SALES") });

export async function resetTodaySalesDisplay(input: unknown) {
  const user = await requirePermission("dashboard:reset-sales");
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return { error: "The reset was not confirmed." };
  try {
    const reset = await resetDashboardTodaySales(user.id);
    revalidatePath("/dashboard");
    return { data: { resetAt: reset.resetAt.toISOString() } };
  } catch {
    return { error: "Today’s sales display could not be reset." };
  }
}
