import type { OrderStatus, QuotationStatus, Role } from "@/generated/prisma/client";

export class Phase4RuleError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = "Phase4RuleError"; }
}

const quotationTransitions: Record<QuotationStatus, readonly QuotationStatus[]> = {
  DRAFT: ["ISSUED"], ISSUED: ["ACCEPTED", "REJECTED", "EXPIRED"], ACCEPTED: ["CONVERTED"], REJECTED: [], EXPIRED: [], CONVERTED: [],
};

export function assertQuotationTransition(from: QuotationStatus, to: QuotationStatus, validUntil?: Date | null, now = new Date()) {
  if (!quotationTransitions[from].includes(to)) throw new Phase4RuleError("INVALID_QUOTATION_TRANSITION", `Quotation cannot move from ${from} to ${to}`);
  const expired = validUntil ? validUntil.toISOString().slice(0, 10) < shopDate(now) : false;
  if (to === "ISSUED" && expired) throw new Phase4RuleError("QUOTATION_EXPIRED", "An expired quotation cannot be issued");
  if (to === "EXPIRED" && !expired) throw new Phase4RuleError("NOT_EXPIRED", "Quotation has not passed its valid-until date");
}

const orderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["DESIGNING"], DESIGNING: ["WAITING_APPROVAL"], WAITING_APPROVAL: ["APPROVED"], APPROVED: ["PRINTING"], PRINTING: ["FINISHING"], FINISHING: ["READY"], READY: ["DELIVERED"], DELIVERED: [], CANCELLED: [],
};

const roleTransition: Partial<Record<OrderStatus, readonly Role[]>> = {
  DESIGNING: ["ADMIN", "STAFF", "MANAGER", "DESIGNER"], WAITING_APPROVAL: ["ADMIN", "STAFF", "MANAGER", "DESIGNER"], APPROVED: ["ADMIN", "STAFF", "MANAGER", "CASHIER"],
  PRINTING: ["ADMIN", "STAFF", "MANAGER", "PRODUCTION"], FINISHING: ["ADMIN", "STAFF", "MANAGER", "PRODUCTION"], READY: ["ADMIN", "STAFF", "MANAGER", "PRODUCTION"], DELIVERED: ["ADMIN", "STAFF", "MANAGER", "CASHIER"],
};

export function assertOrderTransition(from: OrderStatus, to: OrderStatus, role: Role) {
  if (from === "DELIVERED" || from === "CANCELLED") throw new Phase4RuleError("TERMINAL_ORDER", "Delivered or cancelled orders cannot be changed");
  if (to === "CANCELLED") {
    if (role !== "ADMIN" && role !== "MANAGER") throw new Phase4RuleError("UNAUTHORIZED_TRANSITION", "Only an administrator or manager can cancel an order");
    return;
  }
  if (!orderTransitions[from].includes(to)) throw new Phase4RuleError("INVALID_ORDER_TRANSITION", `Order cannot move from ${from} to ${to}`);
  if (!roleTransition[to]?.includes(role)) throw new Phase4RuleError("UNAUTHORIZED_TRANSITION", "Your role cannot perform this order transition");
}

export function assertQuotationEditable(status: QuotationStatus) {
  if (status !== "DRAFT") throw new Phase4RuleError("QUOTATION_LOCKED", "Only draft quotations can be edited");
}

export function dueState(dueDate: Date | null, status: OrderStatus, shopDate: string) {
  if (!dueDate || status === "DELIVERED" || status === "CANCELLED") return null;
  const due = dueDate.toISOString().slice(0, 10);
  if (due < shopDate) return "OVERDUE" as const;
  if (due === shopDate) return "DUE_TODAY" as const;
  return "UPCOMING" as const;
}

export function shopDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function formatBusinessNumber(prefix: string, sequence: bigint) {
  if (sequence < 1n) throw new Phase4RuleError("INVALID_SEQUENCE", "Number sequence must be positive");
  return `${prefix}-${sequence.toString().padStart(6, "0")}`;
}
