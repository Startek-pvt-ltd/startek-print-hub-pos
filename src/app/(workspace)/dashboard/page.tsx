import Link from "next/link";
import { Banknote, CalendarClock, CircleDollarSign, PackageCheck, TrendingUp, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { formatShopDateTime } from "@/domain/reporting";
import { requirePermission } from "@/lib/auth";
import { getDashboardData } from "@/server/report-service";
import { MonthlySalesChartPanel } from "./monthly-sales-chart-panel";

export default async function DashboardPage() {
  const user = await requirePermission("dashboard:view");
  const data = await getDashboardData(user);
  const metrics = [
    ...(data.canViewFinancials ? [{ label: "Today's sales", value: `Rs. ${data.todaySales}`, note: "All finalized invoices", icon: TrendingUp, color: "text-blue-700 bg-blue-50" }] : []),
    ...(data.canViewExpenses ? [{ label: "Today's expenses", value: `Rs. ${data.todayExpenses}`, note: "Finalized expenses", icon: Banknote, color: "text-rose-700 bg-rose-50" }, { label: "Operational net", value: `Rs. ${data.operationalNet}`, note: "Sales less expenses", icon: WalletCards, color: "text-violet-700 bg-violet-50" }] : []),
    { label: "Pending orders", value: String(data.pendingOrders), note: "Current production queue", icon: CalendarClock, color: "text-amber-700 bg-amber-50" },
    { label: "Ready orders", value: String(data.readyOrders), note: "Waiting for collection", icon: PackageCheck, color: "text-emerald-700 bg-emerald-50" },
    { label: "Due today", value: String(data.dueToday), note: "Active jobs due today", icon: CalendarClock, color: "text-orange-700 bg-orange-50" },
    ...(data.canViewFinancials ? [{ label: "Outstanding", value: `Rs. ${data.outstanding}`, note: user.role === "CASHIER" ? "Your active invoices" : "All active invoice balances", icon: CircleDollarSign, color: "text-cyan-700 bg-cyan-50" }] : []),
  ];
  const recent = [
    ...data.recentInvoices.filter((row) => row.status === "FINALIZED").map((row) => ({ id: `i-${row.id}`, href: `/invoices/${row.id}`, label: `Invoice finalized · ${row.invoiceNumber}`, detail: `${row.customerNameSnapshot ?? "Walk-in customer"} · ${row.createdBy.name}`, amount: `Rs. ${row.grandTotal.toFixed(2)}`, date: row.createdAt })),
    ...data.recentPayments.map((row) => ({ id: `p-${row.id}`, href: `/invoices/${row.invoice.id}`, label: `${row.method.replaceAll("_", " ")} payment · ${row.invoice.invoiceNumber}`, detail: `Recorded by ${row.recordedBy.name}`, amount: `Rs. ${row.amount.toFixed(2)}`, date: row.createdAt })),
    ...data.recentExpenses.map((row) => ({ id: `e-${row.id}`, href: `/expenses/${row.id}`, label: `Expense · ${row.expenseNumber}`, detail: `${row.description} · ${row.paymentMethod.replaceAll("_", " ")} · ${row.createdBy.name}`, amount: `− Rs. ${row.amount.toFixed(2)}`, date: row.expenseDate })),
    ...data.recentMovements.map((row) => ({ id: `m-${row.id}`, href: "/cash-register", label: row.type.replaceAll("_", " "), detail: `${row.reason} · ${row.createdBy.name}`, amount: `${row.type === "CASH_WITHDRAWAL" ? "− " : "+ "}Rs. ${row.amount.toFixed(2)}`, date: row.createdAt })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);
  return <><PageHeading eyebrow="Overview" title="Dashboard" description="Today’s shop activity and production workload, shown for your role." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <Card key={metric.label} className="p-5"><div className={`grid size-12 place-items-center rounded-xl ${metric.color}`}><metric.icon className="size-6" /></div><p className="mt-5 text-sm font-bold text-slate-500">{metric.label}</p><p className="mt-1 text-2xl font-black text-slate-950">{metric.value}</p><p className="mt-2 text-xs text-slate-400">{metric.note}</p></Card>)}</div>
    <div className="mt-5 grid items-start gap-5 xl:grid-cols-[1.3fr_.7fr]">
      {data.canViewFinancials ? <Card className="p-6"><div className="mb-5"><h2 className="text-lg font-black text-slate-900">Monthly sales</h2><p className="text-sm text-slate-500">Finalized invoice totals for the current calendar year.</p></div><MonthlySalesChartPanel data={data.monthly} /></Card> : null}
      <Card className="p-6"><h2 className="text-lg font-black text-slate-900">Recent orders</h2><div className="mt-5 space-y-3">{data.orders.map((order) => <Link href={`/orders/${order.id}`} key={order.id} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 hover:bg-slate-50"><div><p className="font-black text-blue-700">{order.orderNumber}</p><p className="text-sm font-bold text-slate-700">{order.customerNameSnapshot}</p><p className="text-xs text-slate-500">{order.jobName ?? "Untitled job"} · Due {order.dueDate?.toISOString().slice(0, 10) ?? "not set"} · {order.assignedStaff?.name ?? "Unassigned"}</p></div><StatusBadge status={order.status} /></Link>)}</div>{!data.orders.length ? <p className="py-12 text-center text-slate-500">No orders in your current work queue.</p> : null}</Card>
    </div>
    {data.canViewFinancials ? <Card className="mt-5 overflow-hidden"><div className="p-6"><h2 className="text-lg font-black text-slate-900">Recent transactions</h2><p className="text-sm text-slate-500">Latest finalized invoices, valid payments, expenses, and drawer movements.</p></div><div className="divide-y">{recent.map((row) => <Link key={row.id} href={row.href} className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-4 px-6 hover:bg-slate-50"><div><p className="font-bold text-slate-900">{row.label}</p><p className="text-sm text-slate-500">{row.detail} · {formatShopDateTime(row.date)}</p></div><p className="font-black text-slate-900">{row.amount}</p></Link>)}</div>{!recent.length ? <p className="p-12 text-center text-slate-500">No transactions yet.</p> : null}</Card> : null}
  </>;
}
