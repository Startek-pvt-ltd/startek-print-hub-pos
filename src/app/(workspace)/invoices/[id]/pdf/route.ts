import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getInvoiceById } from "@/server/invoice-service";
import { buildReceiptViewModel } from "@/server/receipt-service";
import { generateInvoicePdf } from "@/server/invoice-pdf";
import { getOperationalDataStartAt, isArchivedOperationalRecord } from "@/lib/operational-period";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requirePermission("invoices:view");
  const parsed = z.object({ id: z.string().cuid() }).safeParse(await params);
  if (!parsed.success) return new Response("Invalid invoice", { status: 400 });
  try {
    const [invoice, settings, logo, cutoff] = await Promise.all([
      getInvoiceById(parsed.data.id),
      db.setting.findUnique({ where: { id: "primary" } }),
      readFile(path.join(process.cwd(), "public", "brand", "startek-logo.png")),
      getOperationalDataStartAt(),
    ]);
    if (!invoice) return new Response("Invoice not found", { status: 404 });
    if (isArchivedOperationalRecord(invoice.createdAt, cutoff) && user.role !== "ADMIN") return new Response("Invoice not found", { status: 404 });
    if (!settings)
      return new Response("Business settings unavailable", { status: 503 });
    const bytes = await generateInvoicePdf(
      buildReceiptViewModel(invoice, settings),
      logo,
    );
    const filename = invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Unable to download invoice PDF. Please try again.", {
      status: 500,
    });
  }
}
