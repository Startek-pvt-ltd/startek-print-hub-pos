import { z } from "zod";

const phone = z.string().trim().regex(/^0\d{9}$/, "Use a 10-digit Sri Lankan phone number");
const prefix = z.string().trim().min(2).max(16).regex(/^[A-Z0-9-]+$/, "Use uppercase letters, numbers, and hyphens");

export const settingsSchema = z.object({
  businessName: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(200),
  phonePrimary: phone,
  phoneSecond: phone,
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  currencyCode: z.literal("LKR"),
  displayCurrency: z.literal("Rs."),
  timeZone: z.literal("Asia/Colombo"),
  receiptWidth: z.literal("80mm"),
  printerModel: z.string().trim().min(3).max(80),
  printerConnection: z.literal("USB"),
  invoicePrefix: prefix,
  orderPrefix: prefix,
  quotePrefix: prefix,
  expensePrefix: prefix,
});

export type SettingsInput = z.input<typeof settingsSchema>;
