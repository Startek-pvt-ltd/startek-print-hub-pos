import { describe, expect, it } from "vitest";
import { assertInvoiceCanBeVoided, buildReceiptReprintAudit, customerSnapshot } from "./invoice-rules";

describe("customer invoice snapshots", () => {
  it("supports walk-ins and creates independent customer snapshots", () => {
    expect(customerSnapshot("", "")).toEqual({ name: null, phoneNumber: null });
    const snapshot = customerSnapshot("Test Customer", "0771234567");
    const mutableCustomer = { name: "Test Customer", phoneNumber: "0771234567" };
    mutableCustomer.name = "Updated Customer";
    expect(snapshot).toEqual({ name: "Test Customer", phoneNumber: "0771234567" });
  });

  it("rejects incomplete customer identity", () => expect(() => customerSnapshot("Test", "")).toThrow());
});

describe("invoice void rules", () => {
  it("accepts a reason for a finalized invoice", () => expect(assertInvoiceCanBeVoided("FINALIZED", "Customer cancelled")).toBe("Customer cancelled"));
  it("rejects a missing reason", () => expect(() => assertInvoiceCanBeVoided("FINALIZED", " ")).toThrow("Enter a void reason"));
  it("rejects a second void", () => expect(() => assertInvoiceCanBeVoided("VOID", "Again")).toThrow("already void"));
});

describe("receipt reprint rules", () => {
  it("keeps the invoice number and prepares an auditable non-physical reprint event", () => {
    const event = buildReceiptReprintAudit({ id: "invoice-1", invoiceNumber: "SPH-INV-000001" }, "user-1");
    expect(event.metadata).toEqual({ invoiceNumber: "SPH-INV-000001", physicalPrintConfirmed: false });
    expect(event.action).toBe("RECEIPT_REPRINTED");
  });
});
