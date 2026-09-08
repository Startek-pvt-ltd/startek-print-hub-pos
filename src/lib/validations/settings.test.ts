import { describe, expect, it } from "vitest";
import { settingsSchema } from "./settings";

const valid = {
  businessName: "Startek Print Hub",
  address: "No.62 Padukka Road, Meegoda",
  phonePrimary: "0705935320",
  phoneSecond: "0777250493",
  email: "startekprinthub@gmail.com",
  currencyCode: "LKR",
  displayCurrency: "Rs.",
  timeZone: "Asia/Colombo",
  receiptWidth: "80mm",
  printerModel: "Xprinter XP-80T",
  printerConnection: "USB",
  invoicePrefix: "SPH-INV",
  orderPrefix: "SPH-ORD",
  quotePrefix: "SPH-QT",
  expensePrefix: "SPH-EXP",
};

describe("settings validation", () => {
  it("accepts the configured business identity", () => {
    expect(settingsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects malformed phone numbers and numbering prefixes", () => {
    expect(settingsSchema.safeParse({ ...valid, phonePrimary: "123", invoicePrefix: "invoice" }).success).toBe(false);
  });
});
