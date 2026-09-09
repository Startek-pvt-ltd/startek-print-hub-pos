import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { calculateCashSummary, calculateDifference, nonNegativeMoney, positiveMoney } from "@/domain/cash-register";
import { db } from "@/lib/db";
import type { CashMovementInput, CloseCashSessionInput, OpenCashSessionInput } from "@/lib/validations/phase5";
import { Phase5OperationError } from "@/server/expense-service";

export const cashSessionInclude = {
  openedBy: { select: { name: true } },
  closedBy: { select: { name: true } },
} satisfies Prisma.CashSessionInclude;

async function calculateSessionSummary(tx: Prisma.TransactionClient, cashSessionId: string) {
  const session = await tx.cashSession.findUnique({ where: { id: cashSessionId } });
  if (!session) throw new Phase5OperationError("NOT_FOUND", "Cash session was not found");
  const [payments, expenses, movements] = await Promise.all([
    tx.payment.findMany({
      where: { cashSessionId },
      select: { amount: true, method: true, reversal: { select: { id: true } } },
    }),
    tx.expense.findMany({
      where: { cashSessionId },
      select: { amount: true, paymentMethod: true, status: true },
    }),
    tx.cashMovement.findMany({
      where: { cashSessionId },
      select: { amount: true, type: true },
    }),
  ]);
  return calculateCashSummary({
    openingCash: session.openingCash.toString(),
    payments: payments.map((item) => ({ amount: item.amount.toString(), method: item.method, reversed: Boolean(item.reversal) })),
    expenses: expenses.map((item) => ({ amount: item.amount.toString(), paymentMethod: item.paymentMethod, voided: item.status === "VOID" })),
    movements: movements.map((item) => ({ amount: item.amount.toString(), type: item.type })),
  });
}

export async function getCashSessionSummary(cashSessionId: string) {
  return db.$transaction((tx) => calculateSessionSummary(tx, cashSessionId));
}

export async function openCashSession(input: OpenCashSessionInput, actorId: string) {
  const openingCash = nonNegativeMoney(input.openingCash, "Opening cash");
  try {
    return await db.$transaction(async (tx) => {
      const duplicate = await tx.cashSession.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: cashSessionInclude });
      if (duplicate) return duplicate;
      const session = await tx.cashSession.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          openGuard: "PRIMARY",
          openingCash: openingCash.toFixed(2),
          openedById: actorId,
        },
        include: cashSessionInclude,
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "CASH_REGISTER_OPENED",
          entityType: "CashSession",
          entityId: session.id,
          metadata: { openingCash: openingCash.toFixed(2) },
        },
      });
      return session;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Phase5OperationError("REGISTER_ALREADY_OPEN", "The cash register is already open");
    }
    throw error;
  }
}

export async function addCashMovement(input: CashMovementInput, actorId: string) {
  const amount = positiveMoney(input.amount, "Movement amount");
  return db.$transaction(async (tx) => {
    const duplicate = await tx.cashMovement.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (duplicate) return duplicate;
    const session = await tx.cashSession.findUnique({ where: { openGuard: "PRIMARY" } });
    if (!session) throw new Phase5OperationError("REGISTER_CLOSED", "Open the cash register before adding a movement");
    const movement = await tx.cashMovement.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        cashSessionId: session.id,
        type: input.type,
        amount: amount.toFixed(2),
        reason: input.reason,
        createdById: actorId,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: input.type === "CASH_DEPOSIT" ? "CASH_DEPOSIT_RECORDED" : "CASH_WITHDRAWAL_RECORDED",
        entityType: "CashMovement",
        entityId: movement.id,
        metadata: { cashSessionId: session.id, amount: amount.toFixed(2), reason: input.reason },
      },
    });
    return movement;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function closeCashSession(input: CloseCashSessionInput, actorId: string) {
  const actualCash = nonNegativeMoney(input.actualCash, "Actual cash");
  try {
    return await db.$transaction(async (tx) => {
      const current = await tx.cashSession.findUnique({ where: { id: input.cashSessionId }, include: cashSessionInclude });
      if (!current) throw new Phase5OperationError("NOT_FOUND", "Cash session was not found");
      if (current.status === "CLOSED") {
        if (current.closeIdempotencyKey === input.idempotencyKey) return current;
        throw new Phase5OperationError("SESSION_CLOSED", "This cash session is already closed");
      }
      const summary = await calculateSessionSummary(tx, current.id);
      const difference = calculateDifference(actualCash, summary.expectedCash);
      const closed = await tx.cashSession.update({
        where: { id: current.id },
        data: {
          status: "CLOSED",
          openGuard: null,
          closedAt: new Date(),
          closedById: actorId,
          expectedCash: summary.expectedCash.toFixed(2),
          actualCash: actualCash.toFixed(2),
          difference: difference.toFixed(2),
          closingNote: input.closingNote,
          closeIdempotencyKey: input.idempotencyKey,
        },
        include: cashSessionInclude,
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "CASH_REGISTER_CLOSED",
          entityType: "CashSession",
          entityId: closed.id,
          metadata: {
            expectedCash: summary.expectedCash.toFixed(2),
            actualCash: actualCash.toFixed(2),
            difference: difference.toFixed(2),
          },
        },
      });
      return closed;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Phase5OperationError("DUPLICATE_CLOSE", "This close request was already submitted");
    }
    throw error;
  }
}

export async function getOpenCashSession() {
  const session = await db.cashSession.findUnique({ where: { openGuard: "PRIMARY" }, include: cashSessionInclude });
  if (!session) return null;
  return { session, summary: await getCashSessionSummary(session.id) };
}
