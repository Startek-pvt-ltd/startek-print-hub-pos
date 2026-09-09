import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { positiveMoney } from "@/domain/cash-register";
import { formatBusinessNumber } from "@/domain/phase4";
import { db } from "@/lib/db";
import type { ExpenseInput } from "@/lib/validations/phase5";

export class Phase5OperationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "Phase5OperationError";
  }
}

export const expenseInclude = {
  createdBy: { select: { name: true } },
  voidedBy: { select: { name: true } },
  cashSession: { select: { id: true, status: true, openedAt: true } },
} satisfies Prisma.ExpenseInclude;

export async function createExpense(input: ExpenseInput, actorId: string) {
  const amount = positiveMoney(input.amount, "Expense amount");
  try {
    return await db.$transaction(async (tx) => {
      const duplicate = await tx.expense.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: expenseInclude,
      });
      if (duplicate) {
        if (duplicate.createdById !== actorId) {
          throw new Phase5OperationError("DUPLICATE_SUBMISSION", "This submission key is already in use");
        }
        return duplicate;
      }

      const cashSession = input.paymentMethod === "CASH"
        ? await tx.cashSession.findUnique({ where: { openGuard: "PRIMARY" }, select: { id: true } })
        : null;
      if (input.paymentMethod === "CASH" && !cashSession) {
        throw new Phase5OperationError("REGISTER_CLOSED", "Open the cash register before recording a cash expense");
      }

      const settings = await tx.setting.findUnique({
        where: { id: "primary" },
        select: { expensePrefix: true },
      });
      const counter = await tx.numberCounter.upsert({
        where: { key: "expense" },
        create: { key: "expense", nextValue: 2n },
        update: { nextValue: { increment: 1n } },
        select: { nextValue: true },
      });
      const expenseNumber = formatBusinessNumber(
        settings?.expensePrefix ?? "SPH-EXP",
        counter.nextValue - 1n,
      );
      const expense = await tx.expense.create({
        data: {
          expenseNumber,
          idempotencyKey: input.idempotencyKey,
          category: input.category,
          description: input.description,
          amount: amount.toFixed(2),
          paymentMethod: input.paymentMethod,
          createdById: actorId,
          cashSessionId: cashSession?.id,
        },
        include: expenseInclude,
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "EXPENSE_CREATED",
          entityType: "Expense",
          entityId: expense.id,
          metadata: {
            expenseNumber,
            category: expense.category,
            amount: amount.toFixed(2),
            paymentMethod: expense.paymentMethod,
            cashSessionId: expense.cashSessionId,
          },
        },
      });
      return expense;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Phase5OperationError("DUPLICATE_SUBMISSION", "This expense was already submitted");
    }
    throw error;
  }
}

export async function voidExpense(expenseId: string, reason: string, actorId: string) {
  return db.$transaction(async (tx) => {
    const expense = await tx.expense.findUnique({
      where: { id: expenseId },
      include: { cashSession: { select: { status: true } } },
    });
    if (!expense) throw new Phase5OperationError("NOT_FOUND", "Expense was not found");
    if (expense.status === "VOID") throw new Phase5OperationError("ALREADY_VOID", "Expense is already void");
    if (expense.cashSession?.status === "CLOSED") {
      throw new Phase5OperationError("SESSION_CLOSED", "A cash expense in a closed session cannot be changed");
    }
    const cleanReason = reason.trim();
    if (cleanReason.length < 3) throw new Phase5OperationError("VOID_REASON_REQUIRED", "Enter a void reason");
    const updated = await tx.expense.update({
      where: { id: expense.id },
      data: { status: "VOID", voidedAt: new Date(), voidedById: actorId, voidReason: cleanReason },
      include: expenseInclude,
    });
    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: "EXPENSE_VOIDED",
        entityType: "Expense",
        entityId: expense.id,
        metadata: { expenseNumber: expense.expenseNumber, reason: cleanReason, amount: expense.amount.toFixed(2) },
      },
    });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
