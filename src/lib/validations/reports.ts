import { z } from "zod";

export const reportViews = ["sales", "expenses", "financial", "payments", "staff", "outstanding", "orders", "customers", "cash-sessions"] as const;
export const reportExportKinds = ["sales", "expenses", "payments", "outstanding", "orders", "cash-sessions"] as const;

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const optionalId = z.string().cuid().optional();
const optionalSearch = z.string().trim().max(120).optional();

export const reportQuerySchema = z.object({
  view: z.enum(reportViews).default("sales"),
  preset: z.enum(["today", "week", "month", "custom"]).default("month"),
  from: dateKey,
  to: dateKey,
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  category: z.enum(["MATERIALS", "ELECTRICITY", "SALARY", "TRANSPORT", "MAINTENANCE", "RENT", "PETTY_CASH", "OTHER"]).optional(),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "QR"]).optional(),
  staff: optionalId,
  customer: optionalId,
  status: z.enum(["PENDING", "DESIGNING", "WAITING_APPROVAL", "APPROVED", "PRINTING", "FINISHING", "READY", "DELIVERED", "CANCELLED", "OVERDUE", "OPEN", "CLOSED"]).optional(),
  search: optionalSearch,
  sort: z.enum(["newest", "oldest", "largest"]).default("newest"),
});

export const reportExportSchema = z.object({
  kind: z.enum(reportExportKinds),
  preset: z.enum(["today", "week", "month", "custom"]).default("month"),
  from: dateKey,
  to: dateKey,
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  category: z.enum(["MATERIALS", "ELECTRICITY", "SALARY", "TRANSPORT", "MAINTENANCE", "RENT", "PETTY_CASH", "OTHER"]).optional(),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "QR"]).optional(),
  staff: optionalId,
  status: z.enum(["PENDING", "DESIGNING", "WAITING_APPROVAL", "APPROVED", "PRINTING", "FINISHING", "READY", "DELIVERED", "CANCELLED", "OVERDUE", "OPEN", "CLOSED"]).optional(),
  search: optionalSearch,
  sort: z.enum(["newest", "oldest", "largest"]).default("newest"),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
