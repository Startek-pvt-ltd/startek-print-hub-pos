import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOperationalDataStartAt, isArchivedOperationalRecord } from "@/lib/operational-period";
import { PageHeading } from "@/components/page-heading";
import { QuotationForm } from "../../quotation-form";
export default async function EditQuotation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("quotations:manage");
  const { id } = await params;
  const [q, cutoff] = await Promise.all([
    db.quotation.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } } } }),
    getOperationalDataStartAt(),
  ]);
  if (!q || q.status !== "DRAFT" || isArchivedOperationalRecord(q.createdAt, cutoff)) notFound();
  return (
    <>
      <PageHeading
        eyebrow="Quotations"
        title={`Edit ${q.quotationNumber}`}
        description="Draft quotations remain editable until issued."
      />
      <QuotationForm
        initial={{
          id: q.id,
          customerName: q.customerNameSnapshot,
          customerPhone: q.customerPhoneSnapshot,
          discount: q.discount.toFixed(2),
          notes: q.notes ?? "",
          validUntil: q.validUntil?.toISOString().slice(0, 10) ?? "",
          items: q.items.map((i) => ({
            description: i.description,
            quantity: i.quantity.toString(),
            unitPrice: i.unitPrice.toFixed(2),
          })),
        }}
      />
    </>
  );
}
