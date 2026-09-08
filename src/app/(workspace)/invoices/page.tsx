import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { derivePaymentState, invoiceAmounts } from "@/domain/invoice-view";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";

type Search = { q?: string; status?: string; payment?: string; from?: string; to?: string };

export default async function InvoiceListPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requirePermission("invoices:view");
  const filters = await searchParams;
  const fromDate = parseDate(filters.from, false);
  const toDate = parseDate(filters.to, true);
  const invoices = await db.invoice.findMany({
    where: {
      status: filters.status === "FINALIZED" || filters.status === "VOID" ? filters.status : undefined,
      createdAt: fromDate || toDate ? { gte: fromDate, lte: toDate } : undefined,
      OR: filters.q ? [
        { invoiceNumber: { contains: filters.q, mode: "insensitive" } },
        { customerNameSnapshot: { contains: filters.q, mode: "insensitive" } },
        { customerPhoneSnapshot: { contains: filters.q } },
      ] : undefined,
    },
    include: { createdBy: { select: { name: true } }, payments: { include: { reversal: true } } },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  const rows = invoices.map((invoice) => {
    const payments = invoice.payments.map((payment) => ({ amount: payment.amount.toString(), reversed: Boolean(payment.reversal) }));
    return { invoice, state: derivePaymentState(invoice.status, invoice.grandTotal.toString(), payments), ...invoiceAmounts(invoice.grandTotal.toString(), payments) };
  }).filter((row) => !filters.payment || filters.payment === "ALL" || row.state === filters.payment);

  return <><PageHeading eyebrow="Billing" title="Invoice history" description="Search finalized and void invoices with derived payment balances." action={<Button asChild><Link href="/pos"><Plus className="size-5" /> New invoice</Link></Button>} />
    <Card className="p-5"><form key={JSON.stringify([filters.q, filters.status, filters.payment, filters.from, filters.to])} action="/invoices" method="get" className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_170px_170px_160px_160px_auto]"><Input name="q" defaultValue={filters.q ?? ""} aria-label="Invoice, customer, or phone" placeholder="Invoice, customer, or phone" /><select name="status" aria-label="Invoice status" defaultValue={filters.status ?? "ALL"} className="min-h-12 rounded-xl border border-slate-300 bg-white px-4"><option value="ALL">All statuses</option><option value="FINALIZED">Finalized</option><option value="VOID">Void</option></select><select name="payment" aria-label="Payment status" defaultValue={filters.payment ?? "ALL"} className="min-h-12 rounded-xl border border-slate-300 bg-white px-4"><option value="ALL">All payments</option><option value="UNPAID">Unpaid</option><option value="PARTIAL">Partial</option><option value="PAID">Paid</option><option value="VOID">Void</option></select><Input name="from" type="date" defaultValue={filters.from ?? ""} aria-label="From date" /><Input name="to" type="date" defaultValue={filters.to ?? ""} aria-label="To date" /><Button>Filter</Button></form></Card>
    <Card className="mt-5 overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{["Invoice", "Date / time", "Customer", "Phone", "Total", "Paid", "Outstanding", "Payment", "Cashier"].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(({ invoice, state, paid, outstanding }) => <tr key={invoice.id} className="hover:bg-blue-50/40"><td className="px-5 py-4 font-black text-blue-700"><Link href={`/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link></td><td className="px-5 py-4 text-sm text-slate-600">{formatDate(invoice.createdAt)}</td><td className="px-5 py-4 font-bold">{invoice.customerNameSnapshot ?? "Walk-in"}</td><td className="px-5 py-4 text-slate-600">{invoice.customerPhoneSnapshot ?? "—"}</td><td className="px-5 py-4 font-bold">Rs. {invoice.grandTotal.toFixed(2)}</td><td className="px-5 py-4">Rs. {paid}</td><td className="px-5 py-4 font-bold">Rs. {outstanding}</td><td className="px-5 py-4"><StatusBadge status={state} /></td><td className="px-5 py-4">{invoice.createdBy.name}</td></tr>)}</tbody></table></div>{rows.length === 0 ? <div className="p-12 text-center"><p className="font-black text-slate-800">No invoices found</p><p className="mt-1 text-sm text-slate-500">Adjust the filters or create a new invoice.</p></div> : null}</Card>
  </>;
}

function formatDate(date: Date) { return new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" }).format(date); }
function parseDate(value: string | undefined, endOfDay: boolean) { if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined; const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}+05:30`); return Number.isNaN(date.getTime()) ? undefined : date; }
