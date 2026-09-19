"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createStaffSchema, resetStaffPasswordSchema, updateStaffSchema } from "@/lib/validations/staff";
import { createStaffAccount, resetStaffPassword, StaffOperationError, updateStaffAccount } from "@/server/staff-service";

export type StaffActionState = { error?: string; success?: string };
const safeError = (error: unknown) => error instanceof StaffOperationError ? error.message : "The staff account could not be updated. Please try again.";

export async function createStaff(input: unknown): Promise<StaffActionState> {
  const actor = await requirePermission("staff:manage"); const parsed = createStaffSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the staff details" };
  try { await createStaffAccount(parsed.data, actor); revalidatePath("/staff"); return { success: "Staff account created" }; }
  catch (error) { return { error: safeError(error) }; }
}

export async function updateStaff(input: unknown): Promise<StaffActionState> {
  const actor = await requirePermission("staff:manage"); const parsed = updateStaffSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the staff details" };
  try { await updateStaffAccount(parsed.data, actor); revalidatePath("/staff"); return { success: "Staff account updated" }; }
  catch (error) { return { error: safeError(error) }; }
}

export async function resetPassword(input: unknown): Promise<StaffActionState> {
  const actor = await requirePermission("staff:manage"); const parsed = resetStaffPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the temporary password" };
  try { await resetStaffPassword(parsed.data, actor); revalidatePath("/staff"); return { success: "Password reset and active sessions revoked" }; }
  catch (error) { return { error: safeError(error) }; }
}
