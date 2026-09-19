import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Printer } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOperationalDataStartAt, isArchivedOperationalRecord } from "@/lib/operational-period";
import { ArchivedDataBanner } from "@/components/archived-data-banner";
import { quotationInclude } from "@/server/quotation-service";
import { PageHeading } from "@/components/page-heading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { QuotationActions } from "./quotation-actions";
export default async function QuotationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("quotations:manage");
  const { id } = await params;
  const [q, staff, cutoff] = await Promise.all([
    db.quotation.findUnique({ where: { id }, include: quotationInclude }),
    db.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    getOperationalDataStartAt(),
  ]);
  if (!q) notFound();
  const archived = isArchivedOperationalRecord(q.createdAt, cutoff);
  if (archived && user.role !== "ADMIN") notFound();
  return (
    <>
      <Button asChild variant="ghost" className="mb-5">
        <Link href="/quotations">
          <ArrowLeft className="size-5" /> Quotations
        </Link>
      </Button>
      <PageHeading
        eyebrow="Quotation detail"
        title={q.quotationNumber}
        description={`${q.customerNameSnapshot} · ${q.customerPhoneSnapshot}`}
        action={<StatusBadge status={q.status} />}
      />
      {archived ? <ArchivedDataBanner /> : null}
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-4">Description</th>
                  <th className="p-4">Qty</th>
                  <th className="p-4">Unit</th>
                  <th className="p-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {q.items.map((i) => (
                  <tr className="border-t border-slate-100" key={i.id}>
                    <td className="p-4 font-bold">{i.description}</td>
                    <td className="p-4">{i.quantity.toString()}</td>
                    <td className="p-4">Rs. {i.unitPrice.toFixed(2)}</td>
                    <td className="p-4 text-right font-black">
                      Rs. {i.lineTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card className="p-5">
            <h2 className="font-black">Status history</h2>
            <div className="mt-4 space-y-3">
              {q.statusHistory.map((h) => (
                <div key={h.id} className="rounded-xl bg-slate-50 p-4">
                  <b>
                    {h.previousStatus ? `${h.previousStatus} → ` : ""}
                    {h.newStatus}
                  </b>
                  <p className="text-sm text-slate-500">
                    {fmt(h.createdAt)} · {h.changedBy.name}
                    {h.note ? ` · ${h.note}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <aside className="space-y-5">
          <Card className="p-5">
            <h2 className="font-black">Totals</h2>
            <div className="mt-4 space-y-2">
              <Row l="Subtotal" v={q.subtotal.toFixed(2)} />
              <Row l="Discount" v={q.discount.toFixed(2)} />
              <Row l="Grand total" v={q.grandTotal.toFixed(2)} strong />
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Valid until:{" "}
              {q.validUntil?.toISOString().slice(0, 10) ?? "Not specified"}
            </p>
            {q.notes ? (
              <p className="mt-3 whitespace-pre-wrap text-sm">{q.notes}</p>
            ) : null}
          </Card>
          <Card className="grid gap-3 p-5">
              {!archived && q.status === "DRAFT" ? (
              <Button asChild variant="secondary">
                <Link href={`/quotations/${q.id}/edit`}>
                  <Pencil className="size-5" /> Edit draft
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="secondary">
              <Link href={`/quotations/${q.id}/print`}>
                <Printer className="size-5" /> A4 print view
              </Link>
            </Button>
            {q.order ? (
              <Button asChild>
                <Link href={`/orders/${q.order.id}`}>
                  Open {q.order.orderNumber}
                </Link>
              </Button>
            ) : null}
          </Card>
        </aside>
      </div>
      {!archived ? <div className="mt-5">
        <QuotationActions id={q.id} status={q.status} staff={staff} />
      </div> : null}
    </>
  );
}
function Row({ l, v, strong }: { l: string; v: string; strong?: boolean }) {
  return (
    <div
      className={`flex justify-between ${strong ? "border-t-2 border-slate-900 pt-3 text-lg font-black" : "font-bold"}`}
    >
      <span>{l}</span>
      <span>Rs. {v}</span>
    </div>
  );
}
function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(d);
}
