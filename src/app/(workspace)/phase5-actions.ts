"use server";

import { revalidatePath } from "next/cache";
import { CashRegisterRuleError } from "@/domain/cash-register";
import { requirePermission } from "@/lib/auth";
import { cashMovementSchema, closeCashSessionSchema, expenseInputSchema, expenseVoidSchema, openCashSessionSchema } from "@/lib/validations/phase5";
import { addCashMovement, closeCashSession, openCashSession } from "@/server/cash-register-service";
import { createExpense, Phase5OperationError, voidExpense } from "@/server/expense-service";

export type Phase5State<T = never> = { error?: string; data?: T };

function safeError(error: unknown) {
  return error instanceof Phase5OperationError || error instanceof CashRegisterRuleError
    ? error.message
    : "The operation could not be completed. Please try again.";
}

export async function createExpenseAction(input: unknown): Promise<Phase5State<{ id: string }>> {
  const user = await requirePermission("expenses:manage");
  const parsed = expenseInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the expense details" };
  try {
    const expense = await createExpense(parsed.data, user.id);
    revalidatePath("/expenses");
    revalidatePath("/cash-register");
    return { data: { id: expense.id } };
  } catch (error) {
    return { error: safeError(error) };
  }
}

export async function voidExpenseAction(input: unknown): Promise<Phase5State> {
  const user = await requirePermission("expenses:manage");
  const parsed = expenseVoidSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid void reason" };
  try {
    await voidExpense(parsed.data.expenseId, parsed.data.reason, user.id);
    revalidatePath(`/expenses/${parsed.data.expenseId}`);
    revalidatePath("/expenses");
    revalidatePath("/cash-register");
    return {};
  } catch (error) {
    return { error: safeError(error) };
  }
}

export async function openCashSessionAction(input: unknown): Promise<Phase5State<{ id: string }>> {
  const user = await requirePermission("cash-register:operate");
  const parsed = openCashSessionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter valid opening cash" };
  try {
    const session = await openCashSession(parsed.data, user.id);
    revalidatePath("/cash-register");
    return { data: { id: session.id } };
  } catch (error) {
    return { error: safeError(error) };
  }
}

export async function addCashMovementAction(input: unknown): Promise<Phase5State> {
  const user = await requirePermission("cash-register:adjust");
  const parsed = cashMovementSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the cash movement" };
  try {
    await addCashMovement(parsed.data, user.id);
    revalidatePath("/cash-register");
    return {};
  } catch (error) {
    return { error: safeError(error) };
  }
}

export async function closeCashSessionAction(input: unknown): Promise<Phase5State> {
  const user = await requirePermission("cash-register:operate");
  const parsed = closeCashSessionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the closing details" };
  try {
    await closeCashSession(parsed.data, user.id);
    revalidatePath("/cash-register");
    revalidatePath(`/cash-register/${parsed.data.cashSessionId}`);
    return {};
  } catch (error) {
    return { error: safeError(error) };
  }
}
