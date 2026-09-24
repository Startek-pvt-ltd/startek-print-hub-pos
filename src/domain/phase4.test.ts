import { describe, expect, it } from "vitest";
import { assertOrderTransition, assertQuotationEditable, assertQuotationTransition, dueState, formatBusinessNumber } from "./phase4";

describe("quotation lifecycle", () => {
  it.each([["DRAFT","ISSUED"],["ISSUED","ACCEPTED"],["ISSUED","REJECTED"],["ACCEPTED","CONVERTED"]] as const)("allows %s to %s",(a,b)=>expect(()=>assertQuotationTransition(a,b)).not.toThrow());
  it("rejects conversion before acceptance and all transitions after conversion",()=>{expect(()=>assertQuotationTransition("ISSUED","CONVERTED")).toThrow();expect(()=>assertQuotationTransition("CONVERTED","ISSUED")).toThrow()});
  it("only edits drafts",()=>{expect(()=>assertQuotationEditable("DRAFT")).not.toThrow();expect(()=>assertQuotationEditable("ISSUED")).toThrow();expect(()=>assertQuotationEditable("ACCEPTED")).toThrow()});
  it("only records expiry after validUntil",()=>{expect(()=>assertQuotationTransition("ISSUED","EXPIRED",new Date("2026-01-01"),new Date("2026-01-02"))).not.toThrow();expect(()=>assertQuotationTransition("ISSUED","EXPIRED",new Date("2026-01-03"),new Date("2026-01-02"))).toThrow()});
  it("formats atomic counter values",()=>expect(formatBusinessNumber("SPH-QT",12n)).toBe("SPH-QT-000012"));
});

describe("order workflow and authorization",()=>{
  it.each([["PENDING","DESIGNING","DESIGNER"],["DESIGNING","WAITING_APPROVAL","DESIGNER"],["WAITING_APPROVAL","APPROVED","CASHIER"],["APPROVED","PRINTING","PRODUCTION"],["PRINTING","FINISHING","PRODUCTION"],["FINISHING","READY","PRODUCTION"],["READY","DELIVERED","CASHIER"]] as const)("allows %s to %s for %s",(a,b,r)=>expect(()=>assertOrderTransition(a,b,r)).not.toThrow());
  it.each([["PENDING","DESIGNING"],["DESIGNING","WAITING_APPROVAL"],["WAITING_APPROVAL","APPROVED"],["APPROVED","PRINTING"],["PRINTING","FINISHING"],["FINISHING","READY"],["READY","DELIVERED"]] as const)("allows STAFF daily operation from %s to %s",(a,b)=>expect(()=>assertOrderTransition(a,b,"STAFF")).not.toThrow());
  it("rejects skipped and cross-role transitions",()=>{expect(()=>assertOrderTransition("PENDING","PRINTING","ADMIN")).toThrow();expect(()=>assertOrderTransition("PENDING","DESIGNING","PRODUCTION")).toThrow();expect(()=>assertOrderTransition("READY","DELIVERED","DESIGNER")).toThrow()});
  it("restricts cancellation to administrators and legacy managers",()=>{expect(()=>assertOrderTransition("PENDING","CANCELLED","MANAGER")).not.toThrow();expect(()=>assertOrderTransition("PENDING","CANCELLED","CASHIER")).toThrow();expect(()=>assertOrderTransition("PENDING","CANCELLED","STAFF")).toThrow()});
  it("protects terminal states",()=>{expect(()=>assertOrderTransition("DELIVERED","PRINTING","ADMIN")).toThrow();expect(()=>assertOrderTransition("CANCELLED","DESIGNING","ADMIN")).toThrow()});
  it("derives Colombo due states and excludes terminal orders",()=>{expect(dueState(new Date("2026-09-07T00:00:00Z"),"PRINTING","2026-09-08")).toBe("OVERDUE");expect(dueState(new Date("2026-09-08T00:00:00Z"),"READY","2026-09-08")).toBe("DUE_TODAY");expect(dueState(new Date("2026-09-09T00:00:00Z"),"PENDING","2026-09-08")).toBe("UPCOMING");expect(dueState(new Date("2026-09-07T00:00:00Z"),"DELIVERED","2026-09-08")).toBeNull()});
});
