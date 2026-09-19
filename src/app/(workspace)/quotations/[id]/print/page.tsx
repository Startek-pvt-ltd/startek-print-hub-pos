import Image from "next/image";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { QuotationOutputActions } from "./print-button";
import { getOperationalDataStartAt, isArchivedOperationalRecord } from "@/lib/operational-period";

export default async function QuotationPrint({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("quotations:manage");
  const { id } = await params;
  const [quotation, settings, cutoff] = await Promise.all([
    db.quotation.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    db.setting.findUnique({ where: { id: "primary" } }),
    getOperationalDataStartAt(),
  ]);

  if (!quotation) notFound();
  if (isArchivedOperationalRecord(quotation.createdAt, cutoff) && user.role !== "ADMIN") notFound();

  const businessName = settings?.businessName ?? "Startek Print Hub";
  const businessAddress = settings?.address ?? "No.62 Padukka Road, Meegoda";
  const businessPhones = [settings?.phonePrimary, settings?.phoneSecond]
    .filter(Boolean)
    .join(" / ");
  const businessEmail = settings?.email ?? "startekprinthub@gmail.com";

  return (
    <main className="quotation-print-page mx-auto min-h-[297mm] max-w-[210mm] bg-white p-8 text-slate-800 shadow-sm print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
      <style>{`@page quotation { size: A4 portrait; margin: 12mm; } @media print { .quotation-print-page { page: quotation; width: 100%; } html:has(.quotation-print-page), body:has(.quotation-print-page) { background: white !important; } body:has(.quotation-print-page) { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
      <div className="mb-8 print:hidden">
        <QuotationOutputActions
          quotationId={quotation.id}
          quotationNumber={quotation.quotationNumber}
        />
      </div>

      <header className="flex items-center gap-5 border-b-4 border-cyan-500 pb-5">
        <Image
          src="/brand/startek-logo.png"
          alt="Startek Print Hub logo"
          width={88}
          height={88}
          priority
          className="size-22 shrink-0 object-contain"
        />
        <div className="min-w-0">
          <p className="text-2xl font-black tracking-tight text-blue-950">
            {businessName}
          </p>
          <p className="mt-1 text-sm">{businessAddress}</p>
          <p className="mt-1 text-sm">
            {businessPhones} · {businessEmail}
          </p>
        </div>
      </header>

      <section className="my-7 flex items-start justify-between gap-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Quotation for
          </p>
          <p className="mt-1 text-lg font-black text-blue-950">
            {quotation.customerNameSnapshot}
          </p>
          <p>{quotation.customerPhoneSnapshot}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-black tracking-wide text-blue-950">
            QUOTATION
          </p>
          <p className="font-bold text-blue-950">{quotation.quotationNumber}</p>
          <p className="mt-1 text-sm">
            {new Intl.DateTimeFormat("en-LK", {
              dateStyle: "medium",
              timeZone: "Asia/Colombo",
            }).format(quotation.createdAt)}
          </p>
        </div>
      </section>

      <table className="w-full border-collapse text-sm">
        <thead className="bg-blue-950 text-left text-white">
          <tr>
            <th className="p-3">Description</th>
            <th className="w-16 p-3">Qty</th>
            <th className="w-28 p-3">Unit price</th>
            <th className="w-28 p-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {quotation.items.map((item) => (
            <tr className="break-inside-avoid border-b" key={item.id}>
              <td className="p-3">{item.description}</td>
              <td className="p-3">{item.quantity.toString()}</td>
              <td className="p-3">Rs. {item.unitPrice.toFixed(2)}</td>
              <td className="p-3 text-right font-semibold text-blue-950">
                Rs. {item.lineTotal.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto mt-6 w-72 break-inside-avoid space-y-2">
        <TotalRow label="Subtotal" value={quotation.subtotal.toFixed(2)} />
        <TotalRow label="Discount" value={quotation.discount.toFixed(2)} />
        <TotalRow
          label="Grand total"
          value={quotation.grandTotal.toFixed(2)}
          strong
        />
      </div>

      <section className="mt-9 break-inside-avoid text-sm">
        <p>
          <strong>Valid until:</strong>{" "}
          {quotation.validUntil?.toISOString().slice(0, 10) ?? "Not specified"}
        </p>
        {quotation.notes ? (
          <p className="mt-4 whitespace-pre-wrap">
            <strong>Notes:</strong> {quotation.notes}
          </p>
        ) : null}
      </section>

      <footer className="mt-12 border-t pt-3 text-center text-xs text-slate-500">
        Thank you for choosing Startek Print Hub
      </footer>
    </main>
  );
}

function TotalRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${
        strong
          ? "border-t-2 border-blue-950 pt-2 text-lg font-black text-blue-950"
          : ""
      }`}
    >
      <span>{label}</span>
      <span>Rs. {value}</span>
    </div>
  );
}
