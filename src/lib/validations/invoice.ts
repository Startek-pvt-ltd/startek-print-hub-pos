import { z } from "zod";

const decimalInput = z.string().trim().regex(/^\d+(\.\d+)?$/, "Enter a valid number");
const moneyInput = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Use no more than two decimal places");
const phoneInput = z.string().trim().regex(/^0\d{9}$/, "Use a 10-digit Sri Lankan phone number");

export const paymentMethodSchema = z.enum(["CASH", "CARD", "BANK_TRANSFER", "QR"]);

export const invoiceInputSchema = z.object({
  idempotencyKey: z.string().uuid(),
  customerName: z.string().trim().max(100),
  customerPhone: z.union([z.literal(""), phoneInput]),
  discount: moneyInput,
  items: z.array(z.object({
    description: z.string().trim().min(1, "Enter an item description").max(240),
    quantity: decimalInput.refine((value) => { const [, decimals = ""] = value.split("."); return decimals.length <= 3; }, "Use no more than three decimal places"),
    unitPrice: moneyInput,
  })).min(1, "Add at least one item").max(100, "A single invoice supports up to 100 rows"),
  initialPayment: z.object({
    amount: moneyInput,
    method: paymentMethodSchema,
    reference: z.string().trim().max(120),
  }).nullable(),
}).superRefine((value, context) => {
  if (Boolean(value.customerName) !== Boolean(value.customerPhone)) {
    context.addIssue({ code: "custom", path: value.customerName ? ["customerPhone"] : ["customerName"], message: "Enter both customer name and phone, or leave both blank" });
  }
});

export const balancePaymentSchema = z.object({
  invoiceId: z.string().cuid(),
  amount: moneyInput,
  method: paymentMethodSchema,
  reference: z.string().trim().max(120),
});

export const voidInvoiceSchema = z.object({
  invoiceId: z.string().cuid(),
  reason: z.string().trim().min(3, "Enter a void reason").max(300),
});

export const customerLookupSchema = z.object({ phoneNumber: phoneInput });

export type InvoiceInput = z.infer<typeof invoiceInputSchema>;
export type BalancePaymentInput = z.infer<typeof balancePaymentSchema>;
