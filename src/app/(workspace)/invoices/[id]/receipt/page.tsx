import { notFound } from "next/navigation";
import { PrintButton } from "./print-button";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getInvoiceById } from "@/server/invoice-service";
import { buildReceiptViewModel } from "@/server/receipt-service";

export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ reprint?: string }> }) {
  await requirePermission("invoices:view");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [invoice, settings] = await Promise.all([getInvoiceById(id), db.setting.findUnique({ where: { id: "primary" } })]);
  if (!invoice || !settings) notFound();
  const reprintAudit = query.reprint ? await db.auditLog.findFirst({ where: { id: query.reprint, action: "RECEIPT_REPRINTED", entityType: "Invoice", entityId: invoice.id } }) : null;
  const receipt = buildReceiptViewModel(invoice, settings, Boolean(reprintAudit));
  return <div className="mx-auto max-w-[80mm]"><div className="mb-5 flex justify-end print:hidden"><PrintButton /></div><article className="bg-white p-[5mm] font-mono text-[11px] leading-4 text-black shadow-sm print:shadow-none"><header className="text-center"><h1 className="text-base font-black">{receipt.business.businessName}</h1><p>{receipt.business.address}</p><p>{receipt.business.phonePrimary} / {receipt.business.phoneSecond}</p><p>{receipt.business.email}</p>{receipt.reprint ? <p className="my-3 border-y-2 border-black py-2 text-lg font-black">REPRINT</p> : null}{receipt.status === "VOID" ? <p className="my-3 border-y-2 border-black py-2 text-lg font-black">VOID</p> : null}</header><div className="my-3 border-y border-dashed border-black py-2"><p>Invoice: {receipt.invoiceNumber}</p><p>Date: {formatDate(receipt.createdAt)}</p><p>Cashier: {receipt.cashier}</p><p>Customer: {receipt.customerName ?? "Walk-in"}</p>{receipt.customerPhone ? <p>Phone: {receipt.customerPhone}</p> : null}</div><table className="w-full"><thead><tr className="border-b border-black text-left"><th className="py-1">Description</th><th>Qty</th><th className="text-right">Amount</th></tr></thead><tbody>{receipt.items.map((item, index) => <tr key={`${item.description}-${index}`}><td className="pr-1 py-1">{item.description}<br /><span className="text-[9px]">@ Rs. {item.unitPrice}</span></td><td>{item.quantity}</td><td className="text-right">{item.amount}</td></tr>)}</tbody></table><div className="mt-2 border-y border-dashed border-black py-2"><Row label="Subtotal" value={receipt.subtotal} /><Row label="Discount" value={receipt.discount} /><Row label="TOTAL" value={receipt.total} strong /><Row label="Paid" value={receipt.paid} /><Row label="Outstanding" value={receipt.outstanding} strong /></div><div className="py-2"><p className="font-bold">Payments</p>{receipt.payments.length ? receipt.payments.map((payment, index) => <p key={index}>{payment.method.replace("_", " ")} — Rs. {payment.amount}{payment.reversed ? " (REVERSED)" : ""}</p>) : <p>No payment</p>}</div><footer className="mt-3 border-t border-dashed border-black pt-3 text-center"><p className="font-black">{receipt.footer}</p><p>{receipt.business.businessName}</p><p className="mt-2">{receipt.business.receiptFooter}</p></footer></article></div>;
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <p className={`flex justify-between ${strong ? "font-black" : ""}`}><span>{label}</span><span>Rs. {value}</span></p>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" }).format(new Date(value)); }
