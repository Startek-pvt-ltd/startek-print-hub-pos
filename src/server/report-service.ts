import "server-only";

import Decimal from "decimal.js";
import type { ExpenseCategory, OrderStatus, PaymentMethod, Prisma, Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { calculateCashSummary } from "@/domain/cash-register";
import {
  businessDateRange,
  expenseSummary,
  formatReportMoney,
  isOrderOverdue,
  operationalNetIncome,
  orderReportGroup,
  paymentMethodSummary,
  salesSummary,
  shopDateKey,
  type BusinessDateRange,
  type ReportPreset,
} from "@/domain/reporting";

type Viewer = { id: string; role: Role };
type RangeInput = { preset?: ReportPreset; from?: string; to?: string; month?: string; now?: Date; category?: ExpenseCategory; paymentMethod?: PaymentMethod; staff?: string; customer?: string; status?: OrderStatus | "OVERDUE" | "OPEN" | "CLOSED"; search?: string; sort?: "newest" | "oldest" | "largest" };

export type ReportData = Awaited<ReturnType<typeof getReportData>>;

function rangeFor(input: RangeInput) {
  return businessDateRange(input);
}

const paymentSelect = { amount: true, method: true, reversal: { select: { id: true } } } as const;

function invoiceRows(invoices: Array<{ status: "FINALIZED" | "VOID"; grandTotal: Decimal; payments: Array<{ amount: Decimal; method: "CASH" | "CARD" | "BANK_TRANSFER" | "QR"; reversal: { id: string } | null }> }>) {
  return invoices.map((invoice) => ({
    status: invoice.status,
    grandTotal: invoice.grandTotal.toString(),
    payments: invoice.payments.map((payment) => ({ amount: payment.amount.toString(), method: payment.method, reversed: Boolean(payment.reversal) })),
  }));
}

export async function getDashboardData(viewer: Viewer, now = new Date()) {
  const today = rangeFor({ preset: "today", now });
  const privileged = viewer.role === "ADMIN" || viewer.role === "MANAGER";
  const financialViewer = privileged || viewer.role === "CASHIER";
  const invoiceScope = privileged ? {} : { createdById: viewer.id };
  const orderScope: Prisma.OrderWhereInput = viewer.role === "DESIGNER"
    ? { OR: [{ assignedStaffId: viewer.id }, { status: { in: ["PENDING", "DESIGNING", "WAITING_APPROVAL"] } }] }
    : viewer.role === "PRODUCTION"
      ? { OR: [{ assignedStaffId: viewer.id }, { status: { in: ["APPROVED", "PRINTING", "FINISHING", "READY"] } }] }
      : {};
  const year = shopDateKey(now).slice(0, 4);
  const monthKeys = Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
  const chartStart = new Date(`${monthKeys[0]}-01T00:00:00+05:30`);
  const [todayInvoices, todayExpenses, outstandingInvoices, orders, recentInvoices, recentPayments, recentExpenses, recentMovements, chartInvoices, pendingOrders, readyOrders, dueToday] = await Promise.all([
    financialViewer ? db.invoice.findMany({ where: { ...invoiceScope, createdAt: { gte: today.start, lt: today.endExclusive } }, select: { status: true, grandTotal: true, payments: { select: paymentSelect } } }) : [],
    privileged ? db.expense.findMany({ where: { expenseDate: { gte: today.start, lt: today.endExclusive } }, select: { status: true, amount: true, category: true } }) : [],
    financialViewer ? db.invoice.findMany({ where: { ...invoiceScope, status: "FINALIZED" }, select: { status: true, grandTotal: true, payments: { select: paymentSelect } } }) : [],
    db.order.findMany({ where: orderScope, select: { id: true, orderNumber: true, customerNameSnapshot: true, jobName: true, status: true, dueDate: true, assignedStaff: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 8 }),
    financialViewer ? db.invoice.findMany({ where: invoiceScope, select: { id: true, invoiceNumber: true, customerNameSnapshot: true, grandTotal: true, status: true, createdAt: true, createdBy: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 6 }) : [],
    financialViewer ? db.payment.findMany({ where: { ...(privileged ? {} : { recordedById: viewer.id }), invoice: { status: "FINALIZED" }, reversal: null }, select: { id: true, amount: true, method: true, createdAt: true, recordedBy: { select: { name: true } }, invoice: { select: { id: true, invoiceNumber: true } } }, orderBy: { createdAt: "desc" }, take: 6 }) : [],
    privileged ? db.expense.findMany({ where: { status: "FINALIZED" }, select: { id: true, expenseNumber: true, description: true, amount: true, paymentMethod: true, expenseDate: true, createdBy: { select: { name: true } } }, orderBy: { expenseDate: "desc" }, take: 6 }) : [],
    privileged ? db.cashMovement.findMany({ select: { id: true, type: true, reason: true, amount: true, createdAt: true, createdBy: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 6 }) : [],
    financialViewer ? db.invoice.findMany({ where: { ...invoiceScope, status: "FINALIZED", createdAt: { gte: chartStart } }, select: { grandTotal: true, createdAt: true } }) : [],
    db.order.count({ where: { AND: [orderScope, { status: { in: ["PENDING", "DESIGNING", "WAITING_APPROVAL", "APPROVED", "PRINTING", "FINISHING"] } }] } }),
    db.order.count({ where: { AND: [orderScope, { status: "READY" }] } }),
    db.order.count({ where: { AND: [orderScope, { dueDate: new Date(`${today.from}T00:00:00Z`), status: { notIn: ["DELIVERED", "CANCELLED"] } }] } }),
  ]);
  const sales = salesSummary(invoiceRows(todayInvoices));
  const expenses = expenseSummary(todayExpenses.map((expense) => ({ status: expense.status, amount: expense.amount.toString(), category: expense.category })));
  const outstanding = salesSummary(invoiceRows(outstandingInvoices)).outstanding;
  const monthly = monthKeys.map((key) => ({
    month: new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`)),
    sales: Number(chartInvoices.filter((invoice) => shopDateKey(invoice.createdAt).startsWith(key)).reduce((sum, invoice) => sum.add(invoice.grandTotal), new Decimal(0)).toFixed(2)),
  }));
  return {
    role: viewer.role,
    canViewFinancials: financialViewer,
    canViewExpenses: privileged,
    todaySales: formatReportMoney(sales.sales),
    todayExpenses: formatReportMoney(expenses.total),
    operationalNet: formatReportMoney(operationalNetIncome(sales.sales, expenses.total)),
    outstanding: formatReportMoney(outstanding),
    pendingOrders,
    readyOrders,
    dueToday,
    monthly,
    orders,
    recentInvoices,
    recentPayments,
    recentExpenses,
    recentMovements,
  };
}

export async function getReportData(input: RangeInput) {
  const range = rangeFor(input);
  const search = input.search?.trim();
  const invoiceSearch: Prisma.InvoiceWhereInput = search ? { OR: [{ invoiceNumber: { contains: search, mode: "insensitive" } }, { customerNameSnapshot: { contains: search, mode: "insensitive" } }, { customerPhoneSnapshot: { contains: search } }] } : {};
  const orderSearch: Prisma.OrderWhereInput = search ? { OR: [{ orderNumber: { contains: search, mode: "insensitive" } }, { customerNameSnapshot: { contains: search, mode: "insensitive" } }, { customerPhoneSnapshot: { contains: search } }, { jobName: { contains: search, mode: "insensitive" } }] } : {};
  const [invoices, expenses, payments, orders, cashSessions] = await Promise.all([
    db.invoice.findMany({
      where: { createdAt: { gte: range.start, lt: range.endExclusive }, createdById: input.staff, customerId: input.customer, ...invoiceSearch },
      select: { id: true, invoiceNumber: true, customerNameSnapshot: true, customerPhoneSnapshot: true, grandTotal: true, status: true, createdAt: true, createdBy: { select: { id: true, name: true, role: true } }, payments: { select: paymentSelect } },
      orderBy: { createdAt: "desc" },
    }),
    db.expense.findMany({
      where: { expenseDate: { gte: range.start, lt: range.endExclusive }, category: input.category, paymentMethod: input.paymentMethod, createdById: input.staff, ...(search ? { OR: [{ expenseNumber: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }] } : {}) },
      select: { id: true, expenseNumber: true, expenseDate: true, category: true, description: true, paymentMethod: true, amount: true, status: true, createdBy: { select: { id: true, name: true, role: true } } },
      orderBy: { expenseDate: "desc" },
    }),
    db.payment.findMany({
      where: { createdAt: { gte: range.start, lt: range.endExclusive }, method: input.paymentMethod, recordedById: input.staff, invoice: { status: "FINALIZED" } },
      select: { id: true, createdAt: true, amount: true, method: true, reference: true, reversal: { select: { id: true } }, recordedBy: { select: { id: true, name: true, role: true } }, invoice: { select: { id: true, invoiceNumber: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.order.findMany({
      where: { createdAt: { gte: range.start, lt: range.endExclusive }, assignedStaffId: input.staff, ...(input.status && !["OVERDUE", "OPEN", "CLOSED"].includes(input.status) ? { status: input.status as OrderStatus } : {}), ...orderSearch },
      select: { id: true, orderNumber: true, customerNameSnapshot: true, customerPhoneSnapshot: true, jobName: true, status: true, dueDate: true, createdAt: true, assignedStaff: { select: { name: true } }, invoice: { select: { id: true, invoiceNumber: true, grandTotal: true, payments: { select: paymentSelect } } } },
      orderBy: { createdAt: "desc" },
    }),
    db.cashSession.findMany({
      where: { openedAt: { gte: range.start, lt: range.endExclusive }, openedById: input.staff, ...(input.status === "OPEN" || input.status === "CLOSED" ? { status: input.status } : {}) },
      select: { id: true, status: true, openingCash: true, expectedCash: true, actualCash: true, difference: true, openedAt: true, closedAt: true, openedBy: { select: { id: true, name: true, role: true } }, closedBy: { select: { id: true, name: true, role: true } }, payments: { select: paymentSelect }, expenses: { select: { amount: true, paymentMethod: true, status: true } }, movements: { select: { amount: true, type: true } } },
      orderBy: { openedAt: "desc" },
    }),
  ]);
  const normalizedInvoices = invoiceRows(invoices);
  const sales = salesSummary(normalizedInvoices);
  const expenseTotals = expenseSummary(expenses.map((expense) => ({ status: expense.status, amount: expense.amount.toString(), category: expense.category })));
  const paymentTotals = paymentMethodSummary(payments.map((payment) => ({ amount: payment.amount.toString(), method: payment.method, reversed: Boolean(payment.reversal) })));
  const today = shopDateKey(input.now);
  const validInvoices = invoices.filter((invoice) => invoice.status === "FINALIZED").map((invoice) => {
    const summary = salesSummary(invoiceRows([invoice]));
    return { ...invoice, paid: summary.paid.toFixed(2), outstanding: summary.outstanding.toFixed(2) };
  });
  const staff = new Map<string, { id: string; name: string; role: Role; salesCount: number; sales: Decimal; paymentCount: number; payments: Decimal; expenseCount: number; registerOpens: number; registerCloses: number }>();
  for (const invoice of validInvoices) {
    const row = staff.get(invoice.createdBy.id) ?? { ...invoice.createdBy, salesCount: 0, sales: new Decimal(0), paymentCount: 0, payments: new Decimal(0), expenseCount: 0, registerOpens: 0, registerCloses: 0 };
    row.salesCount += 1; row.sales = row.sales.add(invoice.grandTotal); staff.set(row.id, row);
  }
  for (const payment of payments.filter((row) => !row.reversal)) {
    const row = staff.get(payment.recordedBy.id) ?? { ...payment.recordedBy, salesCount: 0, sales: new Decimal(0), paymentCount: 0, payments: new Decimal(0), expenseCount: 0, registerOpens: 0, registerCloses: 0 };
    row.paymentCount += 1; row.payments = row.payments.add(payment.amount); staff.set(row.id, row);
  }
  for (const expense of expenses.filter((row) => row.status === "FINALIZED")) {
    const row = staff.get(expense.createdBy.id) ?? { ...expense.createdBy, salesCount: 0, sales: new Decimal(0), paymentCount: 0, payments: new Decimal(0), expenseCount: 0, registerOpens: 0, registerCloses: 0 };
    row.expenseCount += 1; staff.set(row.id, row);
  }
  for (const session of cashSessions) {
    const opener = staff.get(session.openedBy.id) ?? { ...session.openedBy, salesCount: 0, sales: new Decimal(0), paymentCount: 0, payments: new Decimal(0), expenseCount: 0, registerOpens: 0, registerCloses: 0 };
    opener.registerOpens += 1; staff.set(opener.id, opener);
    if (session.closedBy) { const closer = staff.get(session.closedBy.id) ?? { ...session.closedBy, salesCount: 0, sales: new Decimal(0), paymentCount: 0, payments: new Decimal(0), expenseCount: 0, registerOpens: 0, registerCloses: 0 }; closer.registerCloses += 1; staff.set(closer.id, closer); }
  }
  const customers = new Map<string, { name: string; phone: string; invoiceCount: number; sales: Decimal; paid: Decimal; outstanding: Decimal }>();
  for (const invoice of validInvoices) {
    const key = invoice.customerPhoneSnapshot ?? invoice.customerNameSnapshot ?? "Walk-in";
    const row = customers.get(key) ?? { name: invoice.customerNameSnapshot ?? "Walk-in customer", phone: invoice.customerPhoneSnapshot ?? "—", invoiceCount: 0, sales: new Decimal(0), paid: new Decimal(0), outstanding: new Decimal(0) };
    row.invoiceCount += 1; row.sales = row.sales.add(invoice.grandTotal); row.paid = row.paid.add(invoice.paid); row.outstanding = row.outstanding.add(invoice.outstanding); customers.set(key, row);
  }
  const orderGroups = { PENDING: 0, READY: 0, DELIVERED: 0, CANCELLED: 0, OVERDUE: 0 };
  let normalizedOrders = orders.map((order) => {
    const overdue = isOrderOverdue(order, today); const group = orderReportGroup(order.status, overdue);
    if (group in orderGroups) orderGroups[group as keyof typeof orderGroups] += 1;
    const invoice = order.invoice ? salesSummary(invoiceRows([{ status: "FINALIZED", grandTotal: order.invoice.grandTotal, payments: order.invoice.payments }])) : null;
    return { ...order, overdue, group, paid: invoice?.paid.toFixed(2) ?? null, outstanding: invoice?.outstanding.toFixed(2) ?? null };
  });
  if (input.status === "OVERDUE") normalizedOrders = normalizedOrders.filter((order) => order.overdue);
  if (input.sort === "oldest") validInvoices.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  if (input.sort === "largest") validInvoices.sort((a, b) => Number(b.outstanding) - Number(a.outstanding));
  const normalizedCashSessions = cashSessions.map((session) => {
    const activity = calculateCashSummary({ openingCash: session.openingCash.toString(), payments: session.payments.map((row) => ({ amount: row.amount.toString(), method: row.method, reversed: Boolean(row.reversal) })), expenses: session.expenses.map((row) => ({ amount: row.amount.toString(), paymentMethod: row.paymentMethod, voided: row.status === "VOID" })), movements: session.movements.map((row) => ({ amount: row.amount.toString(), type: row.type })) });
    return { ...session, cashReceipts: activity.cashReceipts.toFixed(2), cashExpenses: activity.cashExpenses.toFixed(2), deposits: activity.cashDeposits.toFixed(2), withdrawals: activity.cashWithdrawals.toFixed(2) };
  });
  return {
    range,
    summary: { invoiceCount: sales.count, sales: sales.sales.toFixed(2), paid: sales.paid.toFixed(2), outstanding: sales.outstanding.toFixed(2), expenseCount: expenseTotals.count, expenses: expenseTotals.total.toFixed(2), operationalNet: operationalNetIncome(sales.sales, expenseTotals.total).toFixed(2), payments: paymentTotals.total.toFixed(2) },
    invoices: validInvoices,
    expenses,
    payments: payments.filter((payment) => !payment.reversal),
    paymentMethods: Object.entries(paymentTotals.groups).map(([method, value]) => ({ method, count: value.count, total: value.total.toFixed(2) })),
    expenseCategories: Object.entries(expenseTotals.byCategory).map(([category, total]) => ({ category, total: total.toFixed(2) })),
    staff: [...staff.values()].map((row) => ({ ...row, sales: row.sales.toFixed(2), payments: row.payments.toFixed(2) })).sort((a, b) => Number(b.sales) - Number(a.sales)),
    customers: [...customers.values()].map((row) => ({ ...row, sales: row.sales.toFixed(2), paid: row.paid.toFixed(2), outstanding: row.outstanding.toFixed(2) })).sort((a, b) => Number(b.sales) - Number(a.sales)),
    outstanding: validInvoices.filter((invoice) => new Decimal(invoice.outstanding).greaterThan(0)),
    orders: normalizedOrders,
    orderGroups,
    cashSessions: normalizedCashSessions,
  };
}

export function publicRange(range: BusinessDateRange) {
  return { from: range.from, to: range.to, label: range.label, preset: range.preset };
}
