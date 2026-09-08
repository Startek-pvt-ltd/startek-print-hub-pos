import { z } from "zod";

const decimal = z.string().trim().regex(/^\d+(\.\d{1,3})?$/, "Enter a valid quantity with up to three decimal places");
const money = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount with up to two decimal places");
const phone = z.string().trim().regex(/^0\d{9}$/, "Use a 10-digit Sri Lankan phone number");
const optionalText = (max: number) => z.string().trim().max(max).nullable().transform((v) => v || null);
const date = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")]).transform((v) => v || null);

export const quotationItemSchema = z.object({ description: z.string().trim().min(1).max(240), quantity: decimal, unitPrice: money });
export const quotationInputSchema = z.object({
  idempotencyKey: z.string().uuid(), customerName: z.string().trim().min(1).max(100), customerPhone: phone,
  discount: money, notes: optionalText(2000), validUntil: date, issueNow: z.boolean(), items: z.array(quotationItemSchema).min(1).max(100),
});
export const quotationEditSchema = quotationInputSchema.omit({ idempotencyKey: true, issueNow: true }).extend({ quotationId: z.string().cuid() });
export const quotationStatusSchema = z.object({ quotationId: z.string().cuid(), status: z.enum(["ISSUED", "ACCEPTED", "REJECTED", "EXPIRED"]), note: optionalText(500) });
export const conversionSchema = z.object({ quotationId: z.string().cuid(), jobName: optionalText(160), dueDate: date, assignedStaffId: z.union([z.literal(""), z.string().cuid()]).transform((v) => v || null), notes: optionalText(2000) });
export const orderStatusSchema = z.object({ orderId: z.string().cuid(), status: z.enum(["DESIGNING", "WAITING_APPROVAL", "APPROVED", "PRINTING", "FINISHING", "READY", "DELIVERED", "CANCELLED"]), note: optionalText(500) });
export const assignmentSchema = z.object({ orderId: z.string().cuid(), assignedStaffId: z.union([z.literal(""), z.string().cuid()]).transform((v) => v || null) });
export const orderEditSchema = z.object({ orderId: z.string().cuid(), jobName: optionalText(160), dueDate: date, notes: optionalText(2000), items: z.array(z.object({ id: z.string().cuid(), size: optionalText(120), material: optionalText(160), finishing: optionalText(300), designInstructions: optionalText(1000), additionalNotes: optionalText(1000) })).min(1).max(100) });
export const invoiceFromOrderSchema = z.object({ orderId: z.string().cuid(), initialPayment: z.union([z.literal(""), money]).transform((v) => v || null) });

export type QuotationInput = z.infer<typeof quotationInputSchema>;
export type QuotationEditInput = z.infer<typeof quotationEditSchema>;
export type ConversionInput = z.infer<typeof conversionSchema>;
export type OrderEditInput = z.infer<typeof orderEditSchema>;
