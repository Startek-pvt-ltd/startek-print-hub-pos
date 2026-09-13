import { notFound } from "next/navigation";
import { PrintButton } from "./print-button";
import { ReceiptDocument } from "./receipt-document";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getInvoiceById } from "@/server/invoice-service";
import { buildReceiptViewModel } from "@/server/receipt-service";

export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ reprint?: string; autoprint?: string }> }) {
  await requirePermission("invoices:view");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [invoice, settings] = await Promise.all([getInvoiceById(id), db.setting.findUnique({ where: { id: "primary" } })]);
  if (!invoice || !settings) notFound();
  const reprintAudit = query.reprint ? await db.auditLog.findFirst({ where: { id: query.reprint, action: "RECEIPT_REPRINTED", entityType: "Invoice", entityId: invoice.id } }) : null;
  const receipt = buildReceiptViewModel(invoice, settings, Boolean(reprintAudit));

  return <div className="receipt-print-page mx-auto max-w-[80mm]">
    <style>{`@page receipt { size: 80mm auto; margin: 0; } @media print { html:has(.receipt-print-page), body:has(.receipt-print-page) { width: 80mm; margin: 0; background: #fff !important; } .receipt-print-page { page: receipt; width: 80mm; } }`}</style>
    <div className="mb-5 print:hidden"><PrintButton autoPrint={query.autoprint === "1"} /></div>
    <ReceiptDocument receipt={receipt} />
  </div>;
}
