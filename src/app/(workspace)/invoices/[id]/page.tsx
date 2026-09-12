import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { reprintReceipt } from "@/app/(workspace)/pos/actions";
import { InvoiceActions } from "./invoice-actions";
import { invoiceAmounts } from "@/domain/invoice-view";
import { getInvoiceById } from "@/server/invoice-service";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";

export default async function InvoiceDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const user = await requirePermission("invoices:view");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();
  const ledger = invoice.payments.map((payment) => ({ amount: payment.amount.toString(), reversed: Boolean(payment.reversal) }));
  const amounts = invoiceAmounts(invoice.grandTotal.toString(), ledger);
  const reprintAction = reprintReceipt.bind(null, invoice.id);
  return <><div className="mb-5"><Button asChild variant="ghost"><Link href="/invoices"><ArrowLeft className="size-5" /> Invoice history</Link></Button></div><PageHeading eyebrow="Invoice detail" title={invoice.invoiceNumber} description={`${formatDate(invoice.createdAt)} · Created by ${invoice.createdBy.name}`} action={<StatusBadge status={invoice.status} />} />
    {query.error === "reprint" ? <p role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 font-bold text-rose-700">The receipt reprint could not be prepared. Please try again.</p> : null}
    {invoice.order ? <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 font-bold text-blue-800">Created from print order <Link className="underline" href={`/orders/${invoice.order.id}`}>{invoice.order.orderNumber}</Link></div> : null}
    {invoice.status === "VOID" ? <div className="mb-5 rounded-2xl border-2 border-rose-300 bg-rose-50 p-5"><p className="text-xl font-black text-rose-800">VOID</p><p className="mt-1 text-sm text-rose-700">{invoice.voidReason} · {invoice.voidedBy?.name ?? "Authorized user"} · {invoice.voidedAt ? formatDate(invoice.voidedAt) : ""}</p></div> : null}
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]"><div className="space-y-5"><Card className="p-6"><h2 className="text-lg font-black">Customer</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Info label="Name" value={invoice.customerNameSnapshot ?? "Walk-in customer"} /><Info label="Phone" value={invoice.customerPhoneSnapshot ?? "—"} /></div></Card><Card className="overflow-hidden"><div className="border-b border-slate-200 p-6"><h2 className="text-lg font-black">Items</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[650px]"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Description</th><th className="px-5 py-4">Qty</th><th className="px-5 py-4">Unit price</th><th className="px-5 py-4 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{invoice.items.map((item) => <tr key={item.id}><td className="px-5 py-4 font-bold">{item.description}</td><td className="px-5 py-4">{item.quantity.toString()}</td><td className="px-5 py-4">Rs. {item.unitPrice.toFixed(2)}</td><td className="px-5 py-4 text-right font-black">Rs. {item.lineTotal.toFixed(2)}</td></tr>)}</tbody></table></div></Card><Card className="p-6"><h2 className="text-lg font-black">Payment history</h2><div className="mt-4 space-y-3">{invoice.payments.map((payment) => <div key={payment.id} className="flex flex-col justify-between gap-2 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center"><div><p className="font-black">{payment.method.replace("_", " ")}{payment.reversal ? <span className="ml-2 text-rose-700">REVERSED</span> : null}</p><p className="text-sm text-slate-500">{formatDate(payment.createdAt)} · {payment.recordedBy.name}{payment.reference ? ` · ${payment.reference}` : ""}</p></div><p className="text-lg font-black">Rs. {payment.amount.toFixed(2)}</p></div>)}{invoice.payments.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-center text-slate-500">No payments recorded.</p> : null}</div></Card></div>
      <aside className="space-y-5"><Card className="p-6"><h2 className="text-lg font-black">Totals</h2><div className="mt-5 space-y-3"><Total label="Subtotal" value={invoice.subtotal.toFixed(2)} /><Total label="Discount" value={invoice.discount.toFixed(2)} /><div className="border-t-2 border-slate-900 pt-3"><Total label="Grand total" value={invoice.grandTotal.toFixed(2)} strong /></div><Total label="Paid" value={amounts.paid} /><Total label="Outstanding" value={amounts.outstanding} strong /></div></Card><Card className="p-5"><div className="grid gap-3"><Button asChild variant="secondary"><Link href={`/invoices/${invoice.id}/receipt`}><Printer className="size-5" /> Print receipt</Link></Button><Button asChild variant="secondary"><a href={`/invoices/${invoice.id}/pdf`} download><Download className="size-5" /> Download PDF</a></Button>{hasPermission(user.role, "receipts:reprint") ? <form action={reprintAction}><Button variant="secondary" className="w-full"><Printer className="size-5" /> Reprint receipt</Button></form> : null}</div></Card></aside></div>
    <div className="mt-5"><InvoiceActions invoiceId={invoice.id} outstanding={amounts.outstanding} isVoid={invoice.status === "VOID"} canPay={hasPermission(user.role, "payments:create")} canVoid={hasPermission(user.role, "invoices:void")} /></div>
  </>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-900">{value}</p></div>; }
function Total({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div className={`flex justify-between ${strong ? "text-lg font-black" : "font-bold text-slate-600"}`}><span>{label}</span><span>Rs. {value}</span></div>; }
function formatDate(date: Date) { return new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" }).format(date); }
