import { z } from "zod";
import { paymentMethodSchema } from "@/lib/validations/invoice";

const money = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount with up to two decimal places");
const positiveMoney = money.refine((value) => Number(value) > 0, "Amount must be greater than zero");
const optionalNote = z.string().trim().max(500).transform((value) => value || null);

export const expenseCategorySchema = z.enum([
  "MATERIALS", "ELECTRICITY", "SALARY", "TRANSPORT", "MAINTENANCE", "RENT", "PETTY_CASH", "OTHER",
]);

export const expenseInputSchema = z.object({
  idempotencyKey: z.string().uuid(),
  category: expenseCategorySchema,
  description: z.string().trim().min(2, "Enter an expense description").max(500),
  amount: positiveMoney,
  paymentMethod: paymentMethodSchema,
});

export const expenseVoidSchema = z.object({
  expenseId: z.string().cuid(),
  reason: z.string().trim().min(3, "Enter a void reason").max(500),
});

export const openCashSessionSchema = z.object({
  idempotencyKey: z.string().uuid(),
  openingCash: money,
});

export const closeCashSessionSchema = z.object({
  cashSessionId: z.string().cuid(),
  idempotencyKey: z.string().uuid(),
  actualCash: money,
  closingNote: optionalNote,
});

export const cashMovementSchema = z.object({
  idempotencyKey: z.string().uuid(),
  type: z.enum(["CASH_DEPOSIT", "CASH_WITHDRAWAL"]),
  amount: positiveMoney,
  reason: z.string().trim().min(3, "Enter a movement reason").max(500),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;
export type OpenCashSessionInput = z.infer<typeof openCashSessionSchema>;
export type CloseCashSessionInput = z.infer<typeof closeCashSessionSchema>;
export type CashMovementInput = z.infer<typeof cashMovementSchema>;
