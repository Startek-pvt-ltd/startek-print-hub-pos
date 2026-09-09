import { NextResponse } from "next/server";
import { formatReportMoney, formatShopDateTime, ReportRuleError, toCsv } from "@/domain/reporting";
import { requirePermission } from "@/lib/auth";
import { reportExportSchema } from "@/lib/validations/reports";
import { getReportData } from "@/server/report-service";

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  await requirePermission("reports:view");
  const { kind } = await params;
  const url = new URL(request.url);
  const parsed = reportExportSchema.safeParse({ kind, ...Object.fromEntries(url.searchParams) });
  if (!parsed.success) return NextResponse.json({ error: "Invalid report export request" }, { status: 400 });
  try {
    const report = await getReportData(parsed.data);
    let headers: string[] = []; let rows: unknown[][] = [];
    if (kind === "sales") { headers = ["Invoice", "Date", "Customer", "Phone", "Staff", "Total", "Paid", "Outstanding", "Status"]; rows = report.invoices.map((row) => [row.invoiceNumber, formatShopDateTime(row.createdAt), row.customerNameSnapshot ?? "Walk-in", row.customerPhoneSnapshot ?? "", row.createdBy.name, formatReportMoney(row.grandTotal.toString()), row.paid, row.outstanding, row.status]); }
    if (kind === "expenses") { headers = ["Expense", "Date", "Category", "Description", "Payment method", "Entered by", "Amount", "Status"]; rows = report.expenses.map((row) => [row.expenseNumber, formatShopDateTime(row.expenseDate), row.category, row.description, row.paymentMethod, row.createdBy.name, formatReportMoney(row.amount.toString()), row.status]); }
    if (kind === "payments") { headers = ["Date", "Invoice", "Method", "Reference", "Recorded by", "Amount"]; rows = report.payments.map((row) => [formatShopDateTime(row.createdAt), row.invoice.invoiceNumber, row.method, row.reference ?? "", row.recordedBy.name, formatReportMoney(row.amount.toString())]); }
    if (kind === "outstanding") { headers = ["Invoice", "Date", "Customer", "Phone", "Total", "Paid", "Outstanding"]; rows = report.outstanding.map((row) => [row.invoiceNumber, formatShopDateTime(row.createdAt), row.customerNameSnapshot ?? "Walk-in", row.customerPhoneSnapshot ?? "", formatReportMoney(row.grandTotal.toString()), row.paid, row.outstanding]); }
    if (kind === "orders") { headers = ["Order", "Created", "Customer", "Phone", "Job", "Status", "Report group", "Due", "Assigned", "Invoice", "Paid", "Outstanding"]; rows = report.orders.map((row) => [row.orderNumber, formatShopDateTime(row.createdAt), row.customerNameSnapshot, row.customerPhoneSnapshot, row.jobName ?? "", row.status, row.group, row.dueDate?.toISOString().slice(0, 10) ?? "", row.assignedStaff?.name ?? "Unassigned", row.invoice?.invoiceNumber ?? "", row.paid ?? "", row.outstanding ?? ""]); }
    if (kind === "cash-sessions") { headers = ["Opened", "Opened by", "Closed", "Closed by", "Opening cash", "Cash receipts", "Cash expenses", "Deposits", "Withdrawals", "Expected cash", "Actual cash", "Difference", "Status"]; rows = report.cashSessions.map((row) => [formatShopDateTime(row.openedAt), row.openedBy.name, row.closedAt ? formatShopDateTime(row.closedAt) : "", row.closedBy?.name ?? "", formatReportMoney(row.openingCash.toString()), row.cashReceipts, row.cashExpenses, row.deposits, row.withdrawals, row.expectedCash?.toFixed(2) ?? "", row.actualCash?.toFixed(2) ?? "", row.difference?.toFixed(2) ?? "", row.status]); }
    const csv = `\uFEFF${toCsv(headers, rows)}`;
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="startek-${kind}-${report.range.from}-${report.range.to}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ReportRuleError ? error.message : "Export failed" }, { status: error instanceof ReportRuleError ? 400 : 500 });
  }
}
